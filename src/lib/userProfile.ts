import { useEffect, useState } from 'react'
import type { Gender } from '../types'
import { supabase } from './supabase'
import { useAuth } from './auth'

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

const DEFAULT: UserProfile = {
  name: '',
  gender: undefined,
  lastPeriod: undefined,
  cycleLength: 28,
  periodLength: 5,
}

function rowToProfile(r: Record<string, unknown>): UserProfile {
  return {
    name: (r.name as string) ?? '',
    gender: (r.gender as Gender) ?? undefined,
    lastPeriod: (r.last_period as string) || undefined,
    cycleLength: Number(r.cycle_length) > 0 ? Number(r.cycle_length) : 28,
    periodLength: Number(r.period_length) > 0 ? Number(r.period_length) : 5,
  }
}

function profileToRow(p: Partial<UserProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.name !== undefined) row.name = p.name
  if (p.gender !== undefined) row.gender = p.gender ?? null
  if (p.lastPeriod !== undefined) row.last_period = p.lastPeriod ?? null
  if (p.cycleLength !== undefined) row.cycle_length = p.cycleLength
  if (p.periodLength !== undefined) row.period_length = p.periodLength
  return row
}

export function useUserProfile(): [UserProfile, (patch: Partial<UserProfile>) => void] {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT })

  useEffect(() => {
    if (!supabase || !user) {
      setProfile({ ...DEFAULT })
      return
    }
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) setProfile(rowToProfile(data as Record<string, unknown>))
      })
    return () => {
      active = false
    }
  }, [user])

  const update = (patch: Partial<UserProfile>) => {
    setProfile((p) => ({ ...p, ...patch }))
    if (!supabase || !user) return
    void supabase
      .from('profiles')
      .upsert({ id: user.id, ...profileToRow(patch) })
      .then(() => undefined)
  }

  return [profile, update]
}

/** Fertility phase computed for `today` given a user profile. */
export type CyclePhase = 'periodo' | 'folicular' | 'fertil' | 'ovulacao' | 'lutea' | 'desconhecido'

export interface CycleInfo {
  phase: CyclePhase
  dayOfCycle: number
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
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())

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
