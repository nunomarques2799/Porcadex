import type { Person } from '../types'

// XP economy: a kiss is worth something, sex more, and international / legendary
// conquests stack extra on top.
export const XP = {
  beijo: 10,
  sexo: 25,
  international: 15,
  legendary: 30,
}

export function xpForPerson(p: Person, home: string): number {
  let xp = p.relationship === 'sexo' ? XP.sexo : XP.beijo
  if (p.country && p.country !== home) xp += XP.international
  if (p.legendary) xp += XP.legendary
  return xp
}

export function totalXp(people: Person[], home: string): number {
  return people.reduce((sum, p) => sum + xpForPerson(p, home), 0)
}

// Triangular level curve: reaching level L needs 25·(L-1)·L XP.
// L1: 0, L2: 50, L3: 150, L4: 300, L5: 500 … (each level costs 50 more).
function xpToReach(level: number): number {
  return 25 * (level - 1) * level
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
