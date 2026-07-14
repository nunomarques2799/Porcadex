import { useEffect, useState } from 'react'
import type { PublicPerson } from '../types'
import { EMPTY_STATS } from '../types'
import { supabase } from './supabase'

function rowToPublicPerson(r: Record<string, unknown>): PublicPerson {
  return {
    id: String(r.id),
    owner: String(r.owner),
    number: Number(r.number),
    name: String(r.name ?? ''),
    nickname: (r.nickname as string) || undefined,
    gender: (r.gender as PublicPerson['gender']) ?? undefined,
    relationship: (r.relationship as string) === 'sexo' ? 'sexo' : 'beijo',
    types:
      Array.isArray(r.types) && (r.types as string[]).length
        ? (r.types as string[])
        : ['normal'],
    country: (r.country as string) || undefined,
    ball: (r.ball as string) || 'poke',
    legendary: Boolean(r.legendary),
    legendaryCats: Array.isArray(r.legendary_cats) ? (r.legendary_cats as string[]) : [],
    avatarId: (r.avatar_id as string) || undefined,
    rating: Number(r.rating ?? 0),
    stats: { ...EMPTY_STATS, ...((r.stats as Record<string, number>) ?? {}) },
    traits: Array.isArray(r.traits) ? (r.traits as string[]) : [],
    favorite: Boolean(r.favorite),
    createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
  }
}

/** Fetch a friend's public (non-private) people. Returns [] until loaded. */
export function useFriendPeople(friendId: string | undefined): {
  people: PublicPerson[]
  loading: boolean
  error: string | null
} {
  const [people, setPeople] = useState<PublicPerson[]>([])
  const [loading, setLoading] = useState<boolean>(!!friendId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !friendId) {
      setPeople([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('public_people')
      .select('*')
      .eq('owner', friendId)
      .order('number', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          setError(err.message)
          setPeople([])
        } else {
          setPeople(((data ?? []) as Record<string, unknown>[]).map(rowToPublicPerson))
          setError(null)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [friendId])

  return { people, loading, error }
}

export interface FriendPublicProfile {
  id: string
  name: string
  friendCode: string
  gender?: 'M' | 'F' | 'O'
  homeCountry?: string
  createdAt: string
}

/** Fetch a friend's public profile row. */
export function useFriendProfile(friendId: string | undefined): {
  profile: FriendPublicProfile | null
  loading: boolean
} {
  const [profile, setProfile] = useState<FriendPublicProfile | null>(null)
  const [loading, setLoading] = useState(!!friendId)

  useEffect(() => {
    if (!supabase || !friendId) {
      setProfile(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('public_profiles')
      .select('id, name, gender, home_country, friend_code, created_at')
      .eq('id', friendId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          const r = data as Record<string, unknown>
          setProfile({
            id: String(r.id),
            name: (r.name as string) || 'Amigo',
            friendCode: (r.friend_code as string) || '',
            gender: (r.gender as FriendPublicProfile['gender']) ?? undefined,
            homeCountry: (r.home_country as string) || undefined,
            createdAt: (r.created_at as string) || '',
          })
        } else {
          setProfile(null)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [friendId])

  return { profile, loading }
}
