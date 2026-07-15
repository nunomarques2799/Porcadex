import { useEffect, useState } from 'react'
import type { Person } from '../types'
import {
  fighterSnapshot,
  replayPvp,
  type FighterSnapshot,
  type PvpTurn,
} from '../data/battle'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type BattleStatus = 'pending' | 'active' | 'finished' | 'declined' | 'cancelled'

export interface BattleRow {
  id: string
  challenger: string
  challenger_person: string
  opponent: string
  opponent_person: string | null
  status: BattleStatus
  seed: number
  setup: { a?: FighterSnapshot; b?: FighterSnapshot }
  turns: PvpTurn[]
  move_a: number | null
  move_b: number | null
  winner: string | null
  created_at: string
}

/** Que lado do combate é este utilizador. */
export function sideOf(row: BattleRow, userId: string): 'a' | 'b' {
  return row.challenger === userId ? 'a' : 'b'
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

/** Desafia um amigo com a minha pessoa. Devolve o id da batalha criada. */
export async function challengeFriend(
  myPerson: Person,
  opponentUserId: string,
): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: 'Sem ligação' }
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id
  if (!me) return { error: 'Sem sessão' }
  const seed = Math.floor(Math.random() * 2_000_000_000)
  const { data, error } = await supabase
    .from('battles')
    .insert({
      challenger: me,
      challenger_person: myPerson.id,
      opponent: opponentUserId,
      status: 'pending',
      seed,
      setup: { a: fighterSnapshot(myPerson) },
      turns: [],
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

/** Aceita um desafio, escolhendo a minha pessoa. Arranca a batalha. */
export async function acceptChallenge(
  battleId: string,
  myPerson: Person,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Sem ligação' }
  const { data: row, error: e1 } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()
  if (e1) return { error: e1.message }
  const setup = { ...((row as BattleRow).setup ?? {}), b: fighterSnapshot(myPerson) }
  const { error } = await supabase
    .from('battles')
    .update({
      opponent_person: myPerson.id,
      status: 'active',
      setup,
      turns: [],
      move_a: null,
      move_b: null,
    })
    .eq('id', battleId)
  if (error) return { error: error.message }
  return {}
}

export async function setBattleStatus(id: string, status: BattleStatus): Promise<void> {
  if (!supabase) return
  await supabase.from('battles').update({ status }).eq('id', id)
}

/** Submete a MINHA jogada (coluna separada por lado — sem clobber). */
export async function submitMove(
  id: string,
  side: 'a' | 'b',
  moveIndex: number,
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('battles')
    .update(side === 'a' ? { move_a: moveIndex } : { move_b: moveIndex })
    .eq('id', id)
}

/** Só o desafiante (host) consolida o turno quando ambas as jogadas chegaram,
 *  para evitar corridas. Reproduz o combate para detetar o fim. */
export async function commitTurnIfReady(row: BattleRow): Promise<void> {
  if (!supabase) return
  if (row.move_a == null || row.move_b == null) return
  if (!row.setup.a || !row.setup.b) return
  const turns = [...row.turns, { a: row.move_a, b: row.move_b }]
  const st = replayPvp({ a: row.setup.a, b: row.setup.b }, Number(row.seed), turns)
  const patch: Record<string, unknown> = { turns, move_a: null, move_b: null }
  if (st.finished) {
    patch.status = 'finished'
    patch.winner = st.winner === 'a' ? row.challenger : row.opponent
  }
  await supabase.from('battles').update(patch).eq('id', row.id)
}

/* ------------------------------------------------------------------ */
/* Subscrições                                                          */
/* ------------------------------------------------------------------ */

/** Desafios pendentes dirigidos a mim (para o sino de notificações). */
export function useIncomingChallenges(): { challenges: BattleRow[] } {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<BattleRow[]>([])

  useEffect(() => {
    if (!supabase || !user) {
      setChallenges([])
      return
    }
    let active = true
    const load = async () => {
      const { data } = await supabase!
        .from('battles')
        .select('*')
        .eq('opponent', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (active) setChallenges((data ?? []) as BattleRow[])
    }
    void load()
    const ch = supabase
      .channel('challenges-' + user.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles', filter: `opponent=eq.${user.id}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      active = false
      void supabase!.removeChannel(ch)
    }
  }, [user])

  return { challenges }
}

/** Uma batalha específica, com atualizações em tempo real. */
export function useBattle(id: string | undefined): {
  battle: BattleRow | null
  loading: boolean
} {
  const [battle, setBattle] = useState<BattleRow | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)

  useEffect(() => {
    if (!supabase || !id) {
      setBattle(null)
      setLoading(false)
      return
    }
    let active = true
    const load = async () => {
      const { data } = await supabase!.from('battles').select('*').eq('id', id).maybeSingle()
      if (!active) return
      setBattle((data as BattleRow) ?? null)
      setLoading(false)
    }
    void load()
    const ch = supabase
      .channel('battle-' + id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${id}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      active = false
      void supabase!.removeChannel(ch)
    }
  }, [id])

  return { battle, loading }
}
