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
 *  person can have many. `userCheated` / `personCheated` mark this specific
 *  moment as a "traição" from either side. */
export interface Moment {
  id: string
  title: string
  date?: string // ISO yyyy-mm-dd
  note?: string
  kind?: 'beijo' | 'sexo'
  userCheated?: boolean
  personCheated?: boolean
}

/** Biological/social sex used both for the app's user and each entry. */
export type Gender = 'M' | 'F' | 'O'

/** The six Pokémon-style combat stats stored per person. */
export interface BattleStats {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

/** Per-person battle progression. XP comes ONLY from battles vs other users'
 *  people; a person starts at level 1. Points are spent to raise a stat of
 *  the user's choice on each level-up. */
export interface BattleData {
  base: BattleStats
  level: number
  xp: number
  points: number // unspent stat points
  wins: number
  losses: number
}

export const EMPTY_BATTLE_BASE: BattleStats = {
  hp: 70,
  atk: 70,
  def: 70,
  spa: 70,
  spd: 70,
  spe: 70,
}

export function emptyBattleData(): BattleData {
  return { base: { ...EMPTY_BATTLE_BASE }, level: 1, xp: 0, points: 0, wins: 0, losses: 0 }
}

/** A single entry in the Porcadex — one person you have a relationship with. */
export interface Person {
  id: string
  number: number // auto-incrementing "Pokédex" number
  name: string
  nickname?: string
  gender?: Gender
  private?: boolean // hidden unless "mostrar privados" is on
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
  /** Combat stats + battle progression. */
  battle: BattleData
  /** How many friends have rated this person (rating is their average). */
  ratingCount?: number
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

/** A friend-visible projection of a Person: everything except sensitive
 *  fields (about, notes, moments, photoIds, private flag). Kept as a
 *  distinct type so UI code cannot accidentally read those fields on a
 *  friend's data. `PublicPerson` is a strict subset of `Person`. */
export type PublicPerson = Pick<
  Person,
  | 'id'
  | 'number'
  | 'name'
  | 'nickname'
  | 'gender'
  | 'relationship'
  | 'types'
  | 'country'
  | 'ball'
  | 'legendary'
  | 'legendaryCats'
  | 'avatarId'
  | 'rating'
  | 'stats'
  | 'traits'
  | 'favorite'
  | 'createdAt'
  | 'battle'
> & {
  owner: string
  ratingCount?: number
  // Subconjunto de `about` que um amigo pode ver no perfil da pessoa.
  instagram?: string
  location?: string
  since?: string // ISO — quando foi apanhado/a
}
