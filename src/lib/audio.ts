// Soundtrack e efeitos do combate.
//
// Os ficheiros vivem em `public/audio/` e NÃO estão no repositório — mete lá
// os teus (ver public/audio/README.md). Tudo aqui é tolerante a ficheiros em
// falta: se um som não existir, o combate corre na mesma, em silêncio. É por
// isso que não há `import` dos ficheiros — seria erro de build se faltassem.

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

// Extensões tentadas por ordem. O browser escolhe a primeira que sabe tocar,
// por isso podes largar .mp3 OU .m4a OU .ogg sem mexer em código.
const EXTS = ['mp3', 'm4a', 'ogg', 'wav']

const MUTE_KEY = 'porcadex.audio.muted'
const VOL_KEY = 'porcadex.audio.volume'

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}
export function getVolume(): number {
  const raw = Number(localStorage.getItem(VOL_KEY))
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5
}

/** `import.meta.env.BASE_URL` respeita o `base: './'` do Vite (GitHub Pages). */
function srcFor(name: string, ext: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}audio/${name}.${ext}`.replace(/([^:])\/\/+/g, '$1/')
}

/** Cache de quais nomes existem, para não repetir 404s a cada golpe. */
const resolved = new Map<string, string | null>()

/** Descobre a primeira extensão que carrega. `null` = som não existe. */
function resolve(name: string): Promise<string | null> {
  const hit = resolved.get(name)
  if (hit !== undefined) return Promise.resolve(hit)

  const tryNext = (i: number): Promise<string | null> => {
    if (i >= EXTS.length) return Promise.resolve(null)
    const url = srcFor(name, EXTS[i])
    return new Promise<string | null>((done) => {
      const probe = new Audio()
      probe.preload = 'auto'
      const ok = () => {
        cleanup()
        done(url)
      }
      const fail = () => {
        cleanup()
        done(null)
      }
      const cleanup = () => {
        probe.removeEventListener('canplaythrough', ok)
        probe.removeEventListener('loadedmetadata', ok)
        probe.removeEventListener('error', fail)
        probe.src = ''
      }
      probe.addEventListener('loadedmetadata', ok, { once: true })
      probe.addEventListener('error', fail, { once: true })
      probe.src = url
    }).then((found) => (found ? found : tryNext(i + 1)))
  }

  const p = tryNext(0).then((url) => {
    resolved.set(name, url)
    return url
  })
  return p
}

let music: HTMLAudioElement | null = null
let musicKey: MusicKey | null = null

/** Toca uma faixa de fundo. Repetir a mesma faixa não a reinicia. */
export async function playMusic(key: MusicKey, { loop = true } = {}): Promise<void> {
  if (musicKey === key && music && !music.paused) return
  stopMusic()
  if (isMuted()) return
  const url = await resolve(key)
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

/** Toca um efeito. Fire-and-forget: sobrepõe-se a si próprio sem cortar. */
export function playSfx(key: SfxKey): void {
  if (isMuted()) return
  void resolve(key).then((url) => {
    if (!url) return
    const el = new Audio(url)
    el.volume = Math.min(1, getVolume() * 1.3)
    void el.play().catch(() => undefined)
  })
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
