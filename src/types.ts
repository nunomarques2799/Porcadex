// Core data model for Porcadex.

/** The six "base stats" used to rate a person, mirroring a Pokémon's stats. */
export type StatKey =
  | 'humor'
  | 'simpatia'
  | 'lealdade'
  | 'inteligencia'
  | 'carisma'
  | 'confianca'

export type Stats = Record<StatKey, number> // each 0–100

/** A memorable moment in the relationship (the "moves" / timeline tab).
 *  `kind` records whether this specific encounter was a kiss or sex — the same
 *  person can have many. */
export interface Moment {
  id: string
  title: string
  date?: string // ISO yyyy-mm-dd
  note?: string
  kind?: 'beijo' | 'sexo'
}

/** A single entry in the Porcadex — one person you have a relationship with. */
export interface Person {
  id: string
  number: number // auto-incrementing "Pokédex" number
  name: string
  nickname?: string
  relationship: string // 'beijo' | 'sexo'
  types: string[] // Pokémon-style types, 1–2 keys into POKE_TYPES
  country?: string // numeric ISO id matching the world map
  ball: string // key into BALLS
  legendary: boolean
  legendaryCats: string[] // keys into LEGENDARY_CATS
  /** Id of the main photo stored in IndexedDB, if any. */
  avatarId?: string
  /** Ids of gallery photos stored in IndexedDB. */
  photoIds: string[]
  rating: number // overall, 0–5 (supports halves)
  stats: Stats
  about: {
    howWeMet?: string
    birthday?: string // ISO yyyy-mm-dd
    location?: string
    phone?: string
    instagram?: string // handle, with or without leading @
    since?: string // ISO yyyy-mm-dd — when you met / added them
  }
  traits: string[] // the person's "abilities"
  notes?: string
  moments: Moment[]
  favorite: boolean
  createdAt: number
}

export const STAT_META: { key: StatKey; label: string }[] = [
  { key: 'humor', label: 'Humor' },
  { key: 'simpatia', label: 'Simpatia' },
  { key: 'lealdade', label: 'Lealdade' },
  { key: 'inteligencia', label: 'Inteligência' },
  { key: 'carisma', label: 'Carisma' },
  { key: 'confianca', label: 'Confiança' },
]

export const EMPTY_STATS: Stats = {
  humor: 50,
  simpatia: 50,
  lealdade: 50,
  inteligencia: 50,
  carisma: 50,
  confianca: 50,
}
