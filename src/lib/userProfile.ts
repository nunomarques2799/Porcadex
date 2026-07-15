import { useEffect, useState } from 'react'
import type { Gender } from '../types'
import type { CycleConfig } from '../data/cycle'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** O perfil do utilizador. Estende `CycleConfig` para poder ser passado
 *  diretamente às funções de ciclo, de XP e de badges. */
export interface UserProfile extends CycleConfig {
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

// A matemática do ciclo vive em `data/cycle` (pura, sem hooks) para que o XP
// e os badges a possam usar. Reexportada aqui pela conveniência de quem já
// importa deste módulo.
export {
  cycleInfo,
  cycleInfoOn,
  isFertileDate,
  hasCycle,
  isoOf,
  PHASE_META,
  type CycleConfig,
  type CycleInfo,
  type CyclePhase,
} from '../data/cycle'
