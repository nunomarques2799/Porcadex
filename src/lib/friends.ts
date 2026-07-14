import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export interface Friend {
  id: string
  name: string
  friendCode: string
  since: string
}

export interface FriendRequest {
  otherId: string
  otherName: string
  otherCode: string
  direction: 'in' | 'out'
  createdAt: string
}

interface UseFriendsResult {
  loading: boolean
  error: string | null
  friends: Friend[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  myCode: string | null
  refresh: () => Promise<void>
  sendRequest: (code: string) => Promise<{ error?: string }>
  acceptRequest: (otherId: string) => Promise<void>
  declineRequest: (otherId: string) => Promise<void>
  cancelRequest: (otherId: string) => Promise<void>
  removeFriend: (otherId: string) => Promise<void>
}

interface FriendshipRow {
  requester: string
  addressee: string
  status: 'pending' | 'accepted'
  created_at: string
  responded_at: string | null
}

interface ProfileRow {
  id: string
  name: string | null
  friend_code: string | null
}

export function useFriends(): UseFriendsResult {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<FriendshipRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({})
  const [myCode, setMyCode] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('friendships')
      .select('*')
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    const friendships = (data ?? []) as FriendshipRow[]
    setRows(friendships)

    // Fetch profile info (name, code) for every "other" user in one shot.
    const otherIds = Array.from(
      new Set(
        friendships.map((r) => (r.requester === user.id ? r.addressee : r.requester)),
      ),
    )
    if (otherIds.length > 0) {
      const { data: profs } = await supabase
        .from('public_profiles')
        .select('id, name, friend_code')
        .in('id', otherIds)
      const map: Record<string, ProfileRow> = {}
      for (const p of (profs ?? []) as ProfileRow[]) map[p.id] = p
      setProfiles(map)
    } else {
      setProfiles({})
    }

    // And my own friend code.
    const { data: mine } = await supabase
      .from('profiles')
      .select('friend_code')
      .eq('id', user.id)
      .maybeSingle()
    setMyCode((mine as { friend_code?: string } | null)?.friend_code ?? null)

    setError(null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!supabase || !user) {
      setRows([])
      setProfiles({})
      setMyCode(null)
      setLoading(false)
      return
    }
    void refresh()
  }, [user, refresh])

  const buildFriend = useCallback(
    (r: FriendshipRow): Friend | null => {
      if (!user) return null
      const otherId = r.requester === user.id ? r.addressee : r.requester
      const prof = profiles[otherId]
      return {
        id: otherId,
        name: prof?.name || 'Amigo',
        friendCode: prof?.friend_code ?? '',
        since: r.responded_at ?? r.created_at,
      }
    },
    [user, profiles],
  )

  const buildRequest = useCallback(
    (r: FriendshipRow, direction: 'in' | 'out'): FriendRequest | null => {
      if (!user) return null
      const otherId = direction === 'in' ? r.requester : r.addressee
      const prof = profiles[otherId]
      return {
        otherId,
        otherName: prof?.name || 'Utilizador',
        otherCode: prof?.friend_code ?? '',
        direction,
        createdAt: r.created_at,
      }
    },
    [user, profiles],
  )

  const { friends, incoming, outgoing } = useMemo(() => {
    if (!user) return { friends: [], incoming: [], outgoing: [] }
    const friends: Friend[] = []
    const incoming: FriendRequest[] = []
    const outgoing: FriendRequest[] = []
    for (const r of rows) {
      if (r.status === 'accepted') {
        const f = buildFriend(r)
        if (f) friends.push(f)
      } else if (r.status === 'pending') {
        if (r.addressee === user.id) {
          const req = buildRequest(r, 'in')
          if (req) incoming.push(req)
        } else if (r.requester === user.id) {
          const req = buildRequest(r, 'out')
          if (req) outgoing.push(req)
        }
      }
    }
    friends.sort((a, b) => a.name.localeCompare(b.name))
    return { friends, incoming, outgoing }
  }, [rows, user, buildFriend, buildRequest])

  const sendRequest = useCallback(
    async (rawCode: string): Promise<{ error?: string }> => {
      if (!supabase || !user) return { error: 'Não autenticado' }
      const code = rawCode.trim().toLowerCase()
      if (!code) return { error: 'Escreve um código' }
      const myLower = (myCode ?? '').toLowerCase()
      if (code === myLower) return { error: 'Esse é o teu próprio código' }

      const { data: found, error: rpcErr } = await supabase.rpc(
        'find_by_friend_code',
        { code },
      )
      if (rpcErr) return { error: rpcErr.message }
      const rows = (found ?? []) as { id: string; name: string; friend_code: string }[]
      const target = rows[0]
      if (!target) return { error: 'Código não encontrado' }
      if (target.id === user.id) return { error: 'Esse é o teu próprio código' }

      const { error: insErr } = await supabase.from('friendships').insert({
        requester: user.id,
        addressee: target.id,
        status: 'pending',
      })
      if (insErr) {
        // Unique-constraint violation → already sent or already friends.
        if (insErr.code === '23505') return { error: 'Já existe um pedido ou amizade' }
        return { error: insErr.message }
      }
      await refresh()
      return {}
    },
    [user, myCode, refresh],
  )

  const acceptRequest = useCallback(
    async (otherId: string) => {
      if (!supabase || !user) return
      const { error: err } = await supabase
        .from('friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('requester', otherId)
        .eq('addressee', user.id)
      if (err) setError(err.message)
      await refresh()
    },
    [user, refresh],
  )

  const declineRequest = useCallback(
    async (otherId: string) => {
      if (!supabase || !user) return
      await supabase
        .from('friendships')
        .delete()
        .eq('requester', otherId)
        .eq('addressee', user.id)
      await refresh()
    },
    [user, refresh],
  )

  const cancelRequest = useCallback(
    async (otherId: string) => {
      if (!supabase || !user) return
      await supabase
        .from('friendships')
        .delete()
        .eq('requester', user.id)
        .eq('addressee', otherId)
      await refresh()
    },
    [user, refresh],
  )

  const removeFriend = useCallback(
    async (otherId: string) => {
      if (!supabase || !user) return
      // Accepted friendship exists in exactly one direction; try both.
      await supabase
        .from('friendships')
        .delete()
        .or(
          `and(requester.eq.${user.id},addressee.eq.${otherId}),` +
            `and(requester.eq.${otherId},addressee.eq.${user.id})`,
        )
      await refresh()
    },
    [user, refresh],
  )

  return {
    loading,
    error,
    friends,
    incoming,
    outgoing,
    myCode,
    refresh,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  }
}
