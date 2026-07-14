import { useEffect, useState } from 'react'
import type { Gender } from '../types'

export interface UserProfile {
  name: string
  gender?: Gender
  /** ISO yyyy-mm-dd of first day of most recent period (F only). */
  lastPeriod?: string
  /** Cycle length in days (F only). */
  cycleLength: number
  /** Period length in days (F only). */
  periodLength: number
}

const KEY = 'porcadex.user.v1'

const DEFAULT: UserProfile = {
  name: '',
  gender: undefined,
  lastPeriod: undefined,
  cycleLength: 28,
  periodLength: 5,
}

function load(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return {
      ...DEFAULT,
      ...parsed,
      cycleLength: Number(parsed.cycleLength) > 0 ? Number(parsed.cycleLength) : 28,
      periodLength: Number(parsed.periodLength) > 0 ? Number(parsed.periodLength) : 5,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function getUserProfile(): UserProfile {
  return load()
}

export function useUserProfile(): [UserProfile, (patch: Partial<UserProfile>) => void] {
  const [profile, setProfile] = useState<UserProfile>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile))
    } catch {
      /* ignore */
    }
  }, [profile])
  const update = (patch: Partial<UserProfile>) =>
    setProfile((p) => ({ ...p, ...patch }))
  return [profile, update]
}

/** Fertility phase computed for `today` given a user profile. */
export type CyclePhase = 'periodo' | 'folicular' | 'fertil' | 'ovulacao' | 'lutea' | 'desconhecido'

export interface CycleInfo {
  phase: CyclePhase
  dayOfCycle: number // 1-based
  nextPeriod: Date | null
  fertileStart: Date | null
  fertileEnd: Date | null
  ovulation: Date | null
  isFertile: boolean
  isPeriod: boolean
  daysToNextPeriod: number | null
}

function toDateOnly(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const DAY = 86400000
const diffDays = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / DAY)

export function cycleInfo(profile: UserProfile, today: Date = new Date()): CycleInfo | null {
  if (profile.gender !== 'F' || !profile.lastPeriod) return null
  const start = toDateOnly(profile.lastPeriod)
  if (!start) return null

  const cycle = profile.cycleLength
  const period = profile.periodLength

  // Normalise "today" to midnight for stable arithmetic.
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Walk the last-period date forward until it's the cycle containing today.
  let cursor = new Date(start)
  while (t.getTime() - cursor.getTime() >= cycle * DAY) {
    cursor = new Date(cursor.getTime() + cycle * DAY)
  }
  const dayOfCycle = diffDays(t, cursor) + 1
  const nextPeriod = new Date(cursor.getTime() + cycle * DAY)
  const ovulation = new Date(cursor.getTime() + (cycle - 14) * DAY)
  const fertileStart = new Date(ovulation.getTime() - 5 * DAY)
  const fertileEnd = new Date(ovulation.getTime() + 1 * DAY)

  const isPeriod = dayOfCycle >= 1 && dayOfCycle <= period
  const isFertile = t >= fertileStart && t <= fertileEnd

  let phase: CyclePhase = 'folicular'
  if (isPeriod) phase = 'periodo'
  else if (t.getTime() === ovulation.getTime()) phase = 'ovulacao'
  else if (isFertile) phase = 'fertil'
  else if (t > ovulation) phase = 'lutea'
  else phase = 'folicular'

  return {
    phase,
    dayOfCycle,
    nextPeriod,
    fertileStart,
    fertileEnd,
    ovulation,
    isFertile,
    isPeriod,
    daysToNextPeriod: diffDays(nextPeriod, t),
  }
}

export const PHASE_META: Record<CyclePhase, { label: string; color: string; desc: string }> = {
  periodo: { label: 'Período', color: '#E23B4E', desc: 'A menstruar' },
  folicular: { label: 'Folicular', color: '#5C90F0', desc: 'Fase folicular' },
  fertil: { label: 'Fértil', color: '#2FAE82', desc: 'Janela fértil — cuidado!' },
  ovulacao: { label: 'Ovulação', color: '#E0A62A', desc: 'Ovulação — pico de fertilidade' },
  lutea: { label: 'Lútea', color: '#A33EA1', desc: 'Fase lútea' },
  desconhecido: { label: '—', color: '#9aa1b5', desc: 'Sem dados' },
}
