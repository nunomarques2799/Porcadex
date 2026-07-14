import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Person } from '../types'
import { EMPTY_STATS } from '../types'
import { DEFAULT_HOME_ID } from '../data/countries'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { deletePhoto } from '../lib/photoStore'
import { migrateLocalToSupabase } from './migration'

interface PeopleContextValue {
  people: Person[]
  loading: boolean
  error: string | null
  getPerson: (id: string) => Person | undefined
  addPerson: (draft: NewPerson) => Promise<Person>
  updatePerson: (id: string, patch: Partial<Person>) => Promise<void>
  deletePerson: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
}

export type NewPerson = Omit<Person, 'id' | 'number' | 'createdAt'>

const PeopleContext = createContext<PeopleContextValue | null>(null)

/** Map a DB row into our client-side `Person` shape. */
function rowToPerson(r: Record<string, unknown>): Person {
  return {
    id: String(r.id),
    number: Number(r.number),
    name: String(r.name ?? ''),
    nickname: (r.nickname as string) || undefined,
    gender: (r.gender as Person['gender']) ?? undefined,
    private: Boolean(r.is_private),
    relationship: (r.relationship as string) === 'sexo' ? 'sexo' : 'beijo',
    types: Array.isArray(r.types) && (r.types as string[]).length ? (r.types as string[]) : ['normal'],
    country: (r.country as string) || undefined,
    ball: (r.ball as string) || 'poke',
    legendary: Boolean(r.legendary),
    legendaryCats: Array.isArray(r.legendary_cats) ? (r.legendary_cats as string[]) : [],
    avatarId: (r.avatar_id as string) || undefined,
    photoIds: Array.isArray(r.photo_ids) ? (r.photo_ids as string[]) : [],
    rating: Number(r.rating ?? 0),
    stats: { ...EMPTY_STATS, ...((r.stats as Record<string, number>) ?? {}) },
    about: (r.about as Person['about']) ?? {},
    traits: Array.isArray(r.traits) ? (r.traits as string[]) : [],
    notes: (r.notes as string) ?? '',
    moments: Array.isArray(r.moments) ? (r.moments as Person['moments']) : [],
    favorite: Boolean(r.favorite),
    createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
  }
}

/** Inverse of rowToPerson (DB columns for insert/update). */
function personToRow(p: Partial<Person>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.name !== undefined) row.name = p.name
  if (p.nickname !== undefined) row.nickname = p.nickname ?? ''
  if (p.gender !== undefined) row.gender = p.gender ?? null
  if (p.private !== undefined) row.is_private = p.private
  if (p.relationship !== undefined) row.relationship = p.relationship
  if (p.types !== undefined) row.types = p.types
  if (p.country !== undefined) row.country = p.country ?? null
  if (p.ball !== undefined) row.ball = p.ball
  if (p.legendary !== undefined) row.legendary = p.legendary
  if (p.legendaryCats !== undefined) row.legendary_cats = p.legendaryCats
  if (p.avatarId !== undefined) row.avatar_id = p.avatarId ?? null
  if (p.photoIds !== undefined) row.photo_ids = p.photoIds
  if (p.rating !== undefined) row.rating = p.rating
  if (p.stats !== undefined) row.stats = p.stats
  if (p.about !== undefined) row.about = p.about
  if (p.traits !== undefined) row.traits = p.traits
  if (p.notes !== undefined) row.notes = p.notes ?? ''
  if (p.moments !== undefined) row.moments = p.moments
  if (p.favorite !== undefined) row.favorite = p.favorite
  return row
}

export function PeopleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) return
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('owner', user.id) // só as MINHAS — RLS deixa ler as dos amigos, mas a lista é só minha
      .order('number', { ascending: true })
    if (error) {
      setError(error.message)
      return
    }
    setPeople((data as Record<string, unknown>[]).map(rowToPerson))
    setError(null)
  }, [user])

  // Initial load per user: attempt migration, then fetch.
  useEffect(() => {
    let cancelled = false
    if (!supabase || !user) {
      setPeople([])
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      try {
        await migrateLocalToSupabase(user.id)
      } catch (e) {
        // Migration is best-effort; log and continue.
        console.warn('Migration failed', e)
      }
      if (cancelled) return
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, refresh])

  const nextNumber = useCallback(
    () => people.reduce((max, p) => Math.max(max, p.number), 0) + 1,
    [people],
  )

  const addPerson = useCallback(
    async (draft: NewPerson): Promise<Person> => {
      if (!supabase || !user) throw new Error('Não autenticado')
      const number = nextNumber()
      const insert = {
        ...personToRow(draft),
        owner: user.id,
        number,
      }
      const { data, error } = await supabase
        .from('people')
        .insert(insert)
        .select('*')
        .single()
      if (error) throw error
      const person = rowToPerson(data as Record<string, unknown>)
      setPeople((prev) => [...prev, person])
      return person
    },
    [user, nextNumber],
  )

  const updatePerson = useCallback(
    async (id: string, patch: Partial<Person>) => {
      if (!supabase || !user) return
      // Optimistic update.
      setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
      const { error } = await supabase
        .from('people')
        .update(personToRow(patch))
        .eq('id', id)
      if (error) {
        // Roll back by refetching.
        setError(error.message)
        await refresh()
      }
    },
    [user, refresh],
  )

  const deletePerson = useCallback(
    async (id: string) => {
      if (!supabase || !user) return
      const person = people.find((p) => p.id === id)
      setPeople((prev) => prev.filter((p) => p.id !== id))
      if (person) {
        const ids = [
          ...(person.avatarId ? [person.avatarId] : []),
          ...person.photoIds,
        ]
        // Fire-and-forget cleanup of photos.
        ids.forEach((pid) => void deletePhoto(pid))
      }
      const { error } = await supabase.from('people').delete().eq('id', id)
      if (error) {
        setError(error.message)
        await refresh()
      }
    },
    [user, people, refresh],
  )

  const toggleFavorite = useCallback(
    async (id: string) => {
      const p = people.find((x) => x.id === id)
      if (!p) return
      await updatePerson(id, { favorite: !p.favorite })
    },
    [people, updatePerson],
  )

  const value = useMemo<PeopleContextValue>(
    () => ({
      people,
      loading,
      error,
      getPerson: (id) => people.find((p) => p.id === id),
      addPerson,
      updatePerson,
      deletePerson,
      toggleFavorite,
    }),
    [people, loading, error, addPerson, updatePerson, deletePerson, toggleFavorite],
  )

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>
}

export function usePeople(): PeopleContextValue {
  const ctx = useContext(PeopleContext)
  if (!ctx) throw new Error('usePeople must be used within PeopleProvider')
  return ctx
}

/** Build a blank person draft ready for the add form. */
export function emptyDraft(): NewPerson {
  return {
    name: '',
    nickname: '',
    gender: undefined,
    private: false,
    relationship: 'beijo',
    types: [],
    country: DEFAULT_HOME_ID, // Portugal pré-selecionado (alterável)
    ball: 'poke',
    legendary: false,
    legendaryCats: [],
    avatarId: undefined,
    photoIds: [],
    rating: 0,
    stats: { ...EMPTY_STATS },
    about: {},
    traits: [],
    notes: '',
    moments: [],
    favorite: false,
  }
}
