// Próximos aniversários das pessoas da Porcadex.

import type { Person } from '../types'
import { toDateOnly } from './cycle'

const DAY = 86400000

export interface UpcomingBirthday {
  person: Person
  /** A próxima ocorrência do aniversário (este ano ou o seguinte). */
  date: Date
  daysAway: number
  /** Anos que faz nessa data. */
  turning: number
  isToday: boolean
}

/** As pessoas com aniversário mais próximo, já ordenadas. Quem não tem data
 *  preenchida fica de fora. */
export function upcomingBirthdays(
  people: Person[],
  today: Date = new Date(),
  limit = 6,
): UpcomingBirthday[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const out: UpcomingBirthday[] = []

  for (const p of people) {
    const born = p.about.birthday ? toDateOnly(p.about.birthday) : null
    if (!born) continue
    // Aniversário deste ano; se já passou, salta para o próximo.
    let next = new Date(t.getFullYear(), born.getMonth(), born.getDate())
    if (next.getTime() < t.getTime()) {
      next = new Date(t.getFullYear() + 1, born.getMonth(), born.getDate())
    }
    const daysAway = Math.round((next.getTime() - t.getTime()) / DAY)
    out.push({
      person: p,
      date: next,
      daysAway,
      turning: next.getFullYear() - born.getFullYear(),
      isToday: daysAway === 0,
    })
  }

  return out.sort((a, b) => a.daysAway - b.daysAway).slice(0, limit)
}

/** "Hoje!", "Amanhã" ou "em N dias". */
export function birthdayWhen(b: UpcomingBirthday): string {
  if (b.isToday) return 'Hoje!'
  if (b.daysAway === 1) return 'Amanhã'
  return `em ${b.daysAway} dias`
}
