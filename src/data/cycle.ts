// Matemática do ciclo menstrual — pura, sem React nem rede.
//
// Vive aqui (e não em lib/userProfile) porque a economia de XP e os badges
// precisam de classificar a data de um momento passado, e esses módulos não
// podem depender de hooks.

import type { Gender } from '../types'

/** Os campos do perfil que descrevem o ciclo. Subconjunto de `UserProfile`. */
export interface CycleConfig {
  gender?: Gender
  /** ISO yyyy-mm-dd do primeiro dia do período mais recente. */
  lastPeriod?: string
  cycleLength: number
  periodLength: number
}

export type CyclePhase =
  | 'periodo'
  | 'folicular'
  | 'fertil'
  | 'ovulacao'
  | 'lutea'
  | 'desconhecido'

export interface CycleInfo {
  phase: CyclePhase
  dayOfCycle: number
  nextPeriod: Date
  fertileStart: Date
  fertileEnd: Date
  ovulation: Date
  isFertile: boolean
  isPeriod: boolean
  daysToNextPeriod: number
}

const DAY = 86400000

export function toDateOnly(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isoOf(d: Date | null | undefined): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Soma dias sem tropeçar na mudança da hora (não usa aritmética de ms). */
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Dias inteiros entre duas datas. `round` absorve os saltos de DST. */
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY)

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Só faz sentido calcular o ciclo de quem o tem e o configurou. */
export function hasCycle(cfg: CycleConfig): boolean {
  return cfg.gender === 'F' && !!cfg.lastPeriod && !!toDateOnly(cfg.lastPeriod)
}

/** O ciclo em que `day` cai, projetado a partir do último período registado.
 *  Ao contrário de um contador simples, projeta para trás tanto como para a
 *  frente — é isso que permite classificar a data de um momento antigo. */
export function cycleInfoOn(cfg: CycleConfig, day: Date): CycleInfo | null {
  if (!hasCycle(cfg)) return null
  const start = toDateOnly(cfg.lastPeriod!)!
  const cycle = cfg.cycleLength > 0 ? cfg.cycleLength : 28
  const period = cfg.periodLength > 0 ? cfg.periodLength : 5
  const t = stripTime(day)

  // Módulo com sinal corrigido: funciona para datas antes de `start`.
  const delta = diffDays(t, start)
  const dayOfCycle = (((delta % cycle) + cycle) % cycle) + 1
  const cursor = addDays(t, -(dayOfCycle - 1)) // 1.º dia deste ciclo

  const nextPeriod = addDays(cursor, cycle)
  const ovulation = addDays(cursor, cycle - 14)
  const fertileStart = addDays(ovulation, -5)
  const fertileEnd = addDays(ovulation, 1)

  const isPeriod = dayOfCycle >= 1 && dayOfCycle <= period
  const isFertile = t >= fertileStart && t <= fertileEnd

  let phase: CyclePhase
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

/** O ciclo hoje. */
export function cycleInfo(cfg: CycleConfig, today: Date = new Date()): CycleInfo | null {
  return cycleInfoOn(cfg, today)
}

/** A data ISO caiu na janela fértil? Falso se não houver ciclo configurado. */
export function isFertileDate(cfg: CycleConfig, iso: string | undefined): boolean {
  if (!iso) return false
  const d = toDateOnly(iso)
  if (!d) return false
  return cycleInfoOn(cfg, d)?.isFertile ?? false
}

export const PHASE_META: Record<CyclePhase, { label: string; color: string; desc: string }> = {
  periodo: { label: 'Período', color: '#E23B4E', desc: 'A menstruar' },
  folicular: { label: 'Folicular', color: '#5C90F0', desc: 'Fase folicular' },
  fertil: { label: 'Fértil', color: '#2FAE82', desc: 'Janela fértil — cuidado!' },
  ovulacao: { label: 'Ovulação', color: '#E0A62A', desc: 'Ovulação — pico de fertilidade' },
  lutea: { label: 'Lútea', color: '#A33EA1', desc: 'Fase lútea' },
  desconhecido: { label: '—', color: '#9aa1b5', desc: 'Sem dados' },
}
