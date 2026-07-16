import type { Person, PublicPerson, Moment } from '../types'
import { isFertileDate, type CycleConfig } from './cycle'

// XP economy: a kiss is worth something, sex more, and international / legendary
// conquests stack extra on top.
export const XP = {
  beijo: 10,
  sexo: 25,
  international: 15,
  legendary: 30,
  // Extra XP earned per repeat moment on the same person, on top of the base
  // conquest XP. Sex is worth more than a kiss.
  momentBeijo: 5,
  momentSexo: 20,
  // Bónus por sexo dentro da janela fértil — risco, logo recompensa.
  momentFertil: 25,
  // XP de treinador por cada vitória de combate cross-user (por porca).
  // Deliberadamente pequeno: as batalhas alimentam sobretudo as porcas, não o
  // treinador — a ~¼ de uma relação, precisarias de ~2000 vitórias para o Nv100.
  battleWin: 5,
}

/** Did this moment land in the fertile window? Only ever true for sex with a
 *  date, and only when the user tracks a cycle (see `data/cycle`). */
export function momentIsFertile(m: Moment, cycle?: CycleConfig): boolean {
  return !!cycle && m.kind === 'sexo' && isFertileDate(cycle, m.date)
}

/** How many fertile-window sex moments are recorded across everyone. */
export function fertileMomentCount(people: Person[], cycle?: CycleConfig): number {
  if (!cycle) return 0
  return people.reduce(
    (sum, p) => sum + p.moments.filter((m) => momentIsFertile(m, cycle)).length,
    0,
  )
}

/** XP the person contributes to the trainer level (global). */
export function xpForPerson(p: Person, home: string, cycle?: CycleConfig): number {
  let xp = p.relationship === 'sexo' ? XP.sexo : XP.beijo
  if (p.country && p.country !== home) xp += XP.international
  if (p.legendary) xp += XP.legendary
  xp += xpFromMoments(p, cycle)
  return xp
}

/** Sum of XP earned from a person's timeline moments alone. */
export function xpFromMoments(p: Person, cycle?: CycleConfig): number {
  return p.moments.reduce((sum, m) => {
    if (m.kind === 'sexo') {
      return sum + XP.momentSexo + (momentIsFertile(m, cycle) ? XP.momentFertil : 0)
    }
    if (m.kind === 'beijo') return sum + XP.momentBeijo
    return sum
  }, 0)
}

/** Per-person "pokémon" XP — grows as you accumulate moments with them. */
export function personXp(p: Person, cycle?: CycleConfig): number {
  const base = p.relationship === 'sexo' ? XP.sexo : XP.beijo
  return base + xpFromMoments(p, cycle)
}

/** Per-person triangular level curve, gentler than the trainer curve:
 *  L1: 0, L2: 25, L3: 75, L4: 150, L5: 250 … (each level +25). */
function personXpToReach(level: number): number {
  return Math.round(12.5 * (level - 1) * level)
}

export function personLevelInfo(xp: number): LevelInfo {
  let level = 1
  while (personXpToReach(level + 1) <= xp) level++
  const base = personXpToReach(level)
  const next = personXpToReach(level + 1)
  return {
    level,
    xp,
    into: xp - base,
    span: next - base,
    toNext: next - xp,
    progress: (xp - base) / (next - base),
  }
}

/** XP de treinador que as vitórias de combate contribuem (pouco, de propósito).
 *  `wins` só é incrementado em batalhas cross-user, por isso é seguro somá-lo. */
export function battleXp(people: { battle?: { wins: number } }[]): number {
  return people.reduce((sum, p) => sum + (p.battle?.wins ?? 0) * XP.battleWin, 0)
}

export function totalXp(people: Person[], home: string, cycle?: CycleConfig): number {
  const conquest = people.reduce((sum, p) => sum + xpForPerson(p, home, cycle), 0)
  return conquest + battleXp(people)
}

/** Public XP: what we can compute for a friend's person, where moments are
 *  not visible. Base + international + legendary only. */
export function publicXpForPerson(p: PublicPerson, home: string): number {
  let xp = p.relationship === 'sexo' ? XP.sexo : XP.beijo
  if (p.country && p.country !== home) xp += XP.international
  if (p.legendary) xp += XP.legendary
  return xp
}

export function publicTotalXp(people: PublicPerson[], home: string): number {
  const conquest = people.reduce((sum, p) => sum + publicXpForPerson(p, home), 0)
  return conquest + battleXp(people)
}

export function publicPersonXp(p: PublicPerson): number {
  return p.relationship === 'sexo' ? XP.sexo : XP.beijo
}

// Triangular level curve: reaching level L needs (L-1)·L XP.
// L1: 0, L2: 2, L3: 6 … L100: 9900. Calibrada para ~500 relações → Nv100
// (uma relação repetida = momentSexo = 20 XP; 500·20 = 10 000 ≈ Nv100).
// Nível ≈ √(20 · nº de relações): sobe depressa no início e abranda no fim.
function xpToReach(level: number): number {
  return (level - 1) * level
}

export interface LevelInfo {
  level: number
  xp: number
  into: number // xp earned into the current level
  span: number // xp needed to clear the current level
  toNext: number
  progress: number // 0–1
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  while (xpToReach(level + 1) <= xp) level++
  const base = xpToReach(level)
  const next = xpToReach(level + 1)
  return {
    level,
    xp,
    into: xp - base,
    span: next - base,
    toNext: next - xp,
    progress: (xp - base) / (next - base),
  }
}
