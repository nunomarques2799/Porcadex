import { useEffect, useState } from 'react'
import type { Person } from '../types'
import {
  teamSnapshot,
  replayPvp,
  normalizeTeamSetup,
  type TeamSetup,
  type TurnAction,
  type PvpTurn,
} from '../data/battle'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type BattleStatus = 'pending' | 'active' | 'finished' | 'declined' | 'cancelled'

export interface BattleRow {
  id: string
  challenger: string
  /** Lutador principal — mantido como coluna própria porque a FK e a política
   *  de RLS de inserção verificam a posse através dele. */
  challenger_person: string
  challenger_team: string[] | null
  opponent: string
  opponent_person: string | null
  opponent_team: string[] | null
  status: BattleStatus
  /** Quantas pessoas por lado (1–6). */
  team_size: number
  seed: number
  setup: { a?: unknown; b?: unknown }
  turns: PvpTurn[]
  action_a: TurnAction | null
  action_b: TurnAction | null
  winner: string | null
  created_at: string
}

/** Que lado do combate é este utilizador. */
export function sideOf(row: BattleRow, userId: string): 'a' | 'b' {
  return row.challenger === userId ? 'a' : 'b'
}

/** As duas equipas do setup, normalizadas (tolera linhas antigas 1v1). */
export function battleSetup(row: BattleRow): TeamSetup {
  return {
    a: normalizeTeamSetup(row.setup?.a),
    b: normalizeTeamSetup(row.setup?.b),
  }
}

/** Os ids das MINHAS pessoas neste combate, na ordem da equipa. */
export function myTeamIds(row: BattleRow, side: 'a' | 'b'): string[] {
  const team = side === 'a' ? row.challenger_team : row.opponent_team
  if (team && team.length) return team
  const lead = side === 'a' ? row.challenger_person : row.opponent_person
  return lead ? [lead] : []
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

/** Desafia um amigo com a minha equipa (1–6). Devolve o id da batalha criada. */
export async function challengeFriend(
  myTeam: Person[],
  opponentUserId: string,
): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: 'Sem ligação' }
  if (!myTeam.length) return { error: 'Equipa vazia' }
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id
  if (!me) return { error: 'Sem sessão' }
  const seed = Math.floor(Math.random() * 2_000_000_000)
  const { data, error } = await supabase
    .from('battles')
    .insert({
      challenger: me,
      challenger_person: myTeam[0].id,
      challenger_team: myTeam.map((p) => p.id),
      opponent: opponentUserId,
      status: 'pending',
      team_size: myTeam.length,
      seed,
      setup: { a: teamSnapshot(myTeam) },
      turns: [],
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

/** Aceita um desafio com a minha equipa. Arranca a batalha. */
export async function acceptChallenge(
  battleId: string,
  myTeam: Person[],
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Sem ligação' }
  const { data: row, error: e1 } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()
  if (e1) return { error: e1.message }
  const r = row as BattleRow
  const size = r.team_size || normalizeTeamSetup(r.setup?.a).length || 1
  if (myTeam.length !== size) {
    return { error: `Este desafio é ${size} vs ${size}.` }
  }
  const setup = { ...(r.setup ?? {}), b: teamSnapshot(myTeam) }
  const { error } = await supabase
    .from('battles')
    .update({
      opponent_person: myTeam[0].id,
      opponent_team: myTeam.map((p) => p.id),
      status: 'active',
      setup,
      turns: [],
      action_a: null,
      action_b: null,
    })
    .eq('id', battleId)
  if (error) return { error: error.message }
  return {}
}

export async function setBattleStatus(id: string, status: BattleStatus): Promise<void> {
  if (!supabase) return
  await supabase.from('battles').update({ status }).eq('id', id)
}

/** Submete a MINHA ação (coluna separada por lado — sem clobber). */
export async function submitAction(
  id: string,
  side: 'a' | 'b',
  action: TurnAction,
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('battles')
    .update(side === 'a' ? { action_a: action } : { action_b: action })
    .eq('id', id)
}

/** Só o desafiante (host) consolida o turno quando ambas as ações chegaram,
 *  para evitar corridas. Reproduz o combate para detetar o fim. */
export async function commitTurnIfReady(row: BattleRow): Promise<void> {
  if (!supabase) return
  if (row.action_a == null || row.action_b == null) return
  const setup = battleSetup(row)
  if (!setup.a.length || !setup.b.length) return
  const turns = [...row.turns, { a: row.action_a, b: row.action_b }]
  const st = replayPvp(setup, Number(row.seed), turns)
  const patch: Record<string, unknown> = { turns, action_a: null, action_b: null }
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
