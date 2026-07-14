// One-shot migration of pre-cloud local data into the current user's
// Supabase account. Runs on first login per user. Idempotent: once the
// "migrated" marker is set for this user, we never touch legacy storage again.

import type { Person } from '../types'
import { EMPTY_STATS } from '../types'
import { supabase } from '../lib/supabase'

const OLD_PEOPLE_KEY = 'porcadex.people.v1'
const OLD_PROFILE_KEY = 'porcadex.user.v1'
const OLD_HOME_KEY = 'porcadex.home'
const migratedKey = (userId: string) => `porcadex.migrated.${userId}`

function normalize(raw: Partial<Person>): Person {
  return {
    ...(raw as Person),
    types: Array.isArray(raw.types) && raw.types.length ? raw.types : ['normal'],
    ball: raw.ball ?? 'poke',
    legendary: raw.legendary ?? false,
    legendaryCats: Array.isArray(raw.legendaryCats) ? raw.legendaryCats : [],
    relationship: raw.relationship === 'sexo' ? 'sexo' : 'beijo',
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
    stats: raw.stats ?? { ...EMPTY_STATS },
    about: raw.about ?? {},
    traits: Array.isArray(raw.traits) ? raw.traits : [],
    moments: Array.isArray(raw.moments) ? raw.moments : [],
    favorite: raw.favorite ?? false,
    private: raw.private ?? false,
  }
}

/** Push any legacy localStorage state up to Supabase for the given user.
 *  Photos stored in IndexedDB are NOT migrated — the local `avatar_id` /
 *  `photo_ids` references will simply fail to resolve on the cloud, and the
 *  user can re-upload. Migrating IndexedDB blobs into Storage is possible but
 *  intentionally out of scope for this first pass. */
export async function migrateLocalToSupabase(userId: string): Promise<void> {
  if (!supabase) return
  const marker = migratedKey(userId)
  if (localStorage.getItem(marker)) return

  // Only migrate if the cloud account is still empty — never overwrite real data.
  const { count, error: countError } = await supabase
    .from('people')
    .select('id', { count: 'exact', head: true })
  if (countError) return
  if ((count ?? 0) > 0) {
    localStorage.setItem(marker, '1')
    return
  }

  // People
  try {
    const raw = localStorage.getItem(OLD_PEOPLE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Person>[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const rows = parsed.map(normalize).map((p, i) => ({
          owner: userId,
          number: p.number || i + 1,
          name: p.name,
          nickname: p.nickname ?? '',
          gender: p.gender ?? null,
          is_private: p.private ?? false,
          relationship: p.relationship,
          types: p.types,
          country: p.country ?? null,
          ball: p.ball,
          legendary: p.legendary,
          legendary_cats: p.legendaryCats,
          // Photos aren't migrated — drop the ids so we don't 404 endlessly.
          avatar_id: null,
          photo_ids: [],
          rating: p.rating,
          stats: p.stats,
          about: p.about,
          traits: p.traits,
          notes: p.notes ?? '',
          moments: p.moments,
          favorite: p.favorite,
        }))
        await supabase.from('people').insert(rows)
      }
    }
  } catch (e) {
    console.warn('People migration failed', e)
  }

  // Profile
  try {
    const rawProfile = localStorage.getItem(OLD_PROFILE_KEY)
    const rawHome = localStorage.getItem(OLD_HOME_KEY)
    const patch: Record<string, unknown> = { id: userId }
    if (rawProfile) {
      const p = JSON.parse(rawProfile) as {
        name?: string
        gender?: 'M' | 'F' | 'O'
        lastPeriod?: string
        cycleLength?: number
        periodLength?: number
      }
      if (p.name) patch.name = p.name
      if (p.gender) patch.gender = p.gender
      if (p.lastPeriod) patch.last_period = p.lastPeriod
      if (p.cycleLength) patch.cycle_length = p.cycleLength
      if (p.periodLength) patch.period_length = p.periodLength
    }
    if (rawHome) patch.home_country = rawHome
    if (Object.keys(patch).length > 1) {
      await supabase.from('profiles').upsert(patch)
    }
  } catch (e) {
    console.warn('Profile migration failed', e)
  }

  localStorage.setItem(marker, '1')
}
