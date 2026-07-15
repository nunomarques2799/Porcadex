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
/* Efeitos — Web Audio                                                 */
/* ------------------------------------------------------------------ */

// Os efeitos têm de soar NO frame do impacto. Um `new Audio(url).play()` só
// arranca depois de ir buscar e descodificar o ficheiro — mesmo já em cache
// dá uns bons 100–300ms de atraso, que se nota como o som a chegar tarde.
// Aqui descodificam-se uma vez para memória e depois disparam na hora.

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
const decoding = new Map<string, Promise<AudioBuffer | null>>()

function context(): AudioContext | null {
  const Ctor =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  // O browser suspende o contexto até haver interação; retomar é barato.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function decode(url: string): Promise<AudioBuffer | null> {
  const done = buffers.get(url)
  if (done) return Promise.resolve(done)
  const running = decoding.get(url)
  if (running) return running

  const job = (async () => {
    const c = context()
    if (!c) return null
    try {
      const res = await fetch(url)
      const raw = await res.arrayBuffer()
      const buf = await c.decodeAudioData(raw)
      buffers.set(url, buf)
      return buf
    } catch {
      return null // som partido ou em falta: silêncio, não é erro fatal
    }
  })()

  decoding.set(url, job)
  return job
}

/** Descodifica os efeitos todos para memória. Chamar ao entrar no combate:
 *  sem isto o primeiro golpe de cada tipo soa tarde. */
export function preloadSfx(): void {
  for (const key of Object.values(SFX)) {
    for (const url of variantsOf.get(key) ?? []) void decode(url)
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

  const c = context()
  const buf = c && buffers.get(url)
  if (c && buf) {
    // Caminho normal: já em memória, arranca no frame.
    const src = c.createBufferSource()
    src.buffer = buf
    const gain = c.createGain()
    gain.gain.value = Math.min(1, getVolume() * 1.3)
    src.connect(gain).connect(c.destination)
    src.start()
    return
  }

  // Ainda por descodificar (preloadSfx não correu, ou Web Audio indisponível):
  // toca à moda antiga e trata de o ter pronto para a próxima.
  void decode(url)
  const el = new Audio(url)
  el.volume = Math.min(1, getVolume() * 1.3)
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
      else void context() // retomar: este clique é a interação que o desbloqueia
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
