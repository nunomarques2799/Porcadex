// Soundtrack e efeitos do combate.
//
// Os ficheiros vivem em `src/audio/` (ver o README lá dentro). Tudo aqui é
// tolerante a ficheiros em falta: se um som não existir, o combate corre na
// mesma, em silêncio.
//
// A lista de ficheiros vem do glob do Vite, resolvido em BUILD-TIME. Antes
// isto sondava a rede à procura de `hit.mp3`, `hit1.mp3`… e adivinhava pelos
// 404s, o que obrigava a numerar as variantes de forma seguida (`victory1`,
// `victory2`) — pôr `victory` + `victory2` fazia a segunda ser ignorada em
// silêncio. Assim sabemos exatamente o que existe: qualquer numeração serve,
// e não se gasta um único pedido a procurar.

import { useCallback, useEffect, useState } from 'react'

/** Faixas de fundo (em loop, exceto as de fim de combate). */
export const MUSIC = {
  battle: 'battle',
  victory: 'victory',
  defeat: 'defeat',
} as const

/** Efeitos pontuais. */
export const SFX = {
  hit: 'hit',
  super: 'super',
  weak: 'weak',
  faint: 'faint',
  select: 'select',
  swap: 'swap',
  levelUp: 'levelup',
} as const

export type MusicKey = (typeof MUSIC)[keyof typeof MUSIC]
export type SfxKey = (typeof SFX)[keyof typeof SFX]

/** Preferência entre formatos, se houver o mesmo som em vários. */
const EXT_RANK: Record<string, number> = { mp3: 0, m4a: 1, ogg: 2, wav: 3 }

const MUTE_KEY = 'porcadex.audio.muted'
const VOL_KEY = 'porcadex.audio.volume'

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}
export function getVolume(): number {
  const raw = Number(localStorage.getItem(VOL_KEY))
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5
}

/** Todos os áudios em src/audio/, resolvidos pelo Vite em build-time. O valor
 *  é só o URL final — o ficheiro só é descarregado quando se toca. */
const FILES = import.meta.glob('../audio/*.{mp3,m4a,ogg,wav}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** `victory2.mp3` → nome "victory", variante 2. Sem número → variante 0. */
const FILE_RE = /^(.+?)(\d*)\.(mp3|m4a|ogg|wav)$/i

/** name → URLs das variantes, por ordem de número. Construído uma vez. */
const variantsOf: Map<string, string[]> = (() => {
  const seen = new Map<string, Map<number, { url: string; rank: number }>>()

  for (const [path, url] of Object.entries(FILES)) {
    const file = path.replace(/^.*\//, '')
    const m = FILE_RE.exec(file)
    if (!m) continue
    const [, name, num, ext] = m
    const idx = num ? Number(num) : 0
    const rank = EXT_RANK[ext.toLowerCase()] ?? 99

    const byIdx = seen.get(name) ?? new Map()
    const cur = byIdx.get(idx)
    // Mesmo som em dois formatos (hit.mp3 + hit.ogg): fica o preferido.
    if (!cur || rank < cur.rank) byIdx.set(idx, { url, rank })
    seen.set(name, byIdx)
  }

  const out = new Map<string, string[]>()
  for (const [name, byIdx] of seen) {
    const urls = [...byIdx.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v.url)
    out.set(name, urls)
  }
  return out
})()

/** Onde vai a rotação de cada som. */
const cursor = new Map<string, number>()

/** A próxima variante, à vez — alternar em vez de sortear evita que o mesmo
 *  som saia duas vezes seguidas, que é o ponto de ter variantes. */
function pick(name: string): string | null {
  const urls = variantsOf.get(name)
  if (!urls || !urls.length) return null
  const i = (cursor.get(name) ?? -1) + 1
  cursor.set(name, i)
  return urls[i % urls.length]
}

/** Quantas variantes existem de um som (0 = não há ficheiro). Útil para
 *  diagnosticar sem abrir o Network. */
export function variantCount(name: string): number {
  return variantsOf.get(name)?.length ?? 0
}

/* ------------------------------------------------------------------ */
/* Efeitos — elementos <audio> pré-carregados                          */
/* ------------------------------------------------------------------ */

// Os efeitos têm de soar NO frame do impacto. O atraso que se ouvia não vinha
// de usar <audio>, vinha de criar um elemento NOVO a cada golpe: só arranca
// depois de ir buscar e descodificar o ficheiro. Aqui os elementos são criados
// e carregados uma vez, e depois é só rebobinar e tocar.
//
// Já foi Web Audio, que é mais rápido, mas no iPhone sai pelo canal do TOQUE:
// com o botão de silêncio ligado ficava tudo mudo, enquanto a música (que usa
// <audio>, canal de media) continuava a ouvir-se. Uns milissegundos não valem
// perder o som todo em metade dos telemóveis.

/** Cópias por som, para dois golpes seguidos não se cortarem um ao outro. */
const POOL = 3
const pools = new Map<string, HTMLAudioElement[]>()

function poolFor(url: string): HTMLAudioElement[] {
  let pool = pools.get(url)
  if (!pool) {
    pool = Array.from({ length: POOL }, () => {
      const el = new Audio(url)
      el.preload = 'auto'
      el.load()
      return el
    })
    pools.set(url, pool)
  }
  return pool
}

/** Carrega os efeitos todos. Chamar ao entrar no combate: sem isto o primeiro
 *  golpe de cada tipo soa tarde. */
export function preloadSfx(): void {
  for (const key of Object.values(SFX)) {
    for (const url of variantsOf.get(key) ?? []) poolFor(url)
  }
}

let music: HTMLAudioElement | null = null
let musicKey: MusicKey | null = null

/** Toca uma faixa de fundo. Repetir a mesma faixa não a reinicia — quando
 *  muda, escolhe a variante seguinte (victory1 → victory2 → victory1…). */
export async function playMusic(key: MusicKey, { loop = true } = {}): Promise<void> {
  if (musicKey === key && music && !music.paused) return
  stopMusic()
  if (isMuted()) return
  const url = pick(key)
  if (!url) return
  const el = new Audio(url)
  el.loop = loop
  el.volume = getVolume()
  music = el
  musicKey = key
  // O browser bloqueia autoplay até haver interação — não é um erro nosso.
  try {
    await el.play()
  } catch {
    /* silêncio até o utilizador tocar em algo */
  }
}

export function stopMusic(): void {
  if (music) {
    music.pause()
    music.src = ''
  }
  music = null
  musicKey = null
}

export function setMusicVolume(v: number): void {
  if (music) music.volume = v
}

/** Toca um efeito, alternando entre as variantes que existirem.
 *  Fire-and-forget: sobrepõe-se a si próprio sem cortar. */
export function playSfx(key: SfxKey): void {
  if (isMuted()) return
  const url = pick(key)
  if (!url) return

  const pool = poolFor(url)
  // Um que esteja livre; se estiverem todos a tocar, rouba-se o primeiro.
  const el = pool.find((a) => a.paused || a.ended) ?? pool[0]
  el.volume = Math.min(1, getVolume() * 1.3)
  try {
    el.currentTime = 0
  } catch {
    /* ainda a carregar — toca à mesma, do início */
  }
  void el.play().catch(() => undefined)
}

/** Estado de som partilhado pela UI (botão de mute + volume). */
export function useAudio(): {
  muted: boolean
  volume: number
  toggleMute: () => void
  setVolume: (v: number) => void
} {
  const [muted, setMuted] = useState(isMuted)
  const [volume, setVol] = useState(getVolume)

  useEffect(() => {
    setMusicVolume(muted ? 0 : volume)
  }, [muted, volume])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      if (next) stopMusic()
      return next
    })
  }, [])

  const setVolume = useCallback((v: number) => {
    setVol(v)
    localStorage.setItem(VOL_KEY, String(v))
    setMusicVolume(v)
  }, [])

  return { muted, volume, toggleMute, setVolume }
}
