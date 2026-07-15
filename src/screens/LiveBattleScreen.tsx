import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Swords, Trophy, X, Repeat, Volume2, VolumeX } from 'lucide-react'
import { usePeople } from '../store/people'
import { useAuth } from '../lib/auth'
import {
  useBattle,
  sideOf,
  battleSetup,
  myTeamIds,
  submitAction,
  commitTurnIfReady,
  setBattleStatus,
} from '../lib/battles'
import { playMusic, stopMusic, playSfx, useAudio, MUSIC, SFX } from '../lib/audio'
import { getType } from '../data/pokeTypes'
import {
  replayPvp,
  applyBattleResult,
  activeOf,
  isAlive,
  benchOptions,
  type TeamState,
} from '../data/battle'
import { Avatar } from '../components/Avatar'
import { InfoBox, MoveMenu, SwitchMenu } from '../components/BattleUI'

const first = (n: string) => n.split(' ')[0]

export function LiveBattleScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { people, updatePerson } = usePeople()
  const { battle, loading } = useBattle(id)
  const { muted, toggleMute } = useAudio()
  const [hover, setHover] = useState(0)
  const [switching, setSwitching] = useState(false)

  const mySide = battle && user ? sideOf(battle, user.id) : 'a'

  // Estado derivado (determinístico) a partir de setup + turnos.
  const state = useMemo(() => {
    if (!battle) return null
    const setup = battleSetup(battle)
    if (!setup.a.length || !setup.b.length) return null
    return replayPvp(setup, Number(battle.seed), battle.turns)
  }, [battle])

  // Host (desafiante) consolida o turno quando ambas as ações chegam.
  useEffect(() => {
    if (!battle || mySide !== 'a') return
    if (battle.status === 'active' && battle.action_a != null && battle.action_b != null) {
      void commitTurnIfReady(battle)
    }
  }, [battle, mySide])

  // Música: entra com o combate, muda no fim.
  const status = battle?.status
  const iWon = !!(battle && user && status === 'finished' && battle.winner === user.id)
  useEffect(() => {
    if (status === 'active') void playMusic(MUSIC.battle)
    else if (status === 'finished') void playMusic(iWon ? MUSIC.victory : MUSIC.defeat, { loop: false })
    return () => {
      if (status === 'finished') stopMusic()
    }
  }, [status, iWon])
  useEffect(() => () => stopMusic(), [])

  // Ao terminar, cada cliente aplica XP à SUA equipa (uma vez só).
  useEffect(() => {
    if (!battle || battle.status !== 'finished' || !user) return
    const key = 'porcadex-pvp-applied-' + battle.id
    if (localStorage.getItem(key)) return
    const setup = battleSetup(battle)
    const foes = mySide === 'a' ? setup.b : setup.a
    if (!foes.length) return
    const mine = myTeamIds(battle, mySide)
      .map((pid) => people.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => !!p)
    if (!mine.length) return
    const foeLevel = Math.round(foes.reduce((s, f) => s + f.level, 0) / foes.length)
    const won = battle.winner === user.id
    for (const p of mine) {
      const { battle: nb } = applyBattleResult(p.battle, won, foeLevel)
      void updatePerson(p.id, { battle: nb })
    }
    localStorage.setItem(key, '1')
  }, [battle, user, people, mySide, updatePerson])

  if (loading) {
    return (
      <div className="screen screen--center">
        <p>A carregar combate…</p>
      </div>
    )
  }
  if (!battle) {
    return (
      <div className="screen screen--center">
        <p>Combate não encontrado.</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>Voltar</button>
      </div>
    )
  }

  const header = (
    <header className="edit__bar">
      <button className="iconbtn" onClick={() => navigate('/')} aria-label="Sair">
        <ChevronLeft size={24} />
      </button>
      <h1 className="edit__title">
        <Swords size={18} /> {battle.team_size || 1}v{battle.team_size || 1} ao vivo
      </h1>
      <button className="iconbtn" onClick={toggleMute} aria-label={muted ? 'Ligar som' : 'Desligar som'}>
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </header>
  )

  // Estados não-ativos ---------------------------------------------------
  if (battle.status === 'pending') {
    return (
      <div className="screen battle">
        {header}
        <div className="live-wait">
          <div className="live-wait__spinner" />
          <p>À espera que o adversário aceite o desafio…</p>
          {mySide === 'a' && (
            <button
              className="btn btn--danger-ghost"
              onClick={() => {
                void setBattleStatus(battle.id, 'cancelled')
                navigate('/')
              }}
            >
              Cancelar desafio
            </button>
          )}
        </div>
      </div>
    )
  }
  if (battle.status === 'declined' || battle.status === 'cancelled') {
    return (
      <div className="screen battle">
        {header}
        <p className="muted-block">
          {battle.status === 'declined' ? 'O desafio foi recusado.' : 'O desafio foi cancelado.'}
        </p>
        <div className="battle-controls">
          <button className="btn btn--primary" onClick={() => navigate('/')}>Voltar</button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="screen battle">
        {header}
        <p className="muted-block">A preparar o combate…</p>
      </div>
    )
  }

  // Perspetiva: a MINHA equipa em baixo, o adversário em cima.
  const allyTeam: TeamState = mySide === 'a' ? state.a : state.b
  const foeTeam: TeamState = mySide === 'a' ? state.b : state.a
  const ally = activeOf(allyTeam)
  const foe = activeOf(foeTeam)
  const myAction = mySide === 'a' ? battle.action_a : battle.action_b
  const oppAction = mySide === 'a' ? battle.action_b : battle.action_a
  const finished = battle.status === 'finished'

  const bench = benchOptions(allyTeam)
  const mustSwitch = !finished && !isAlive(ally)
  const canAct = !finished && myAction == null

  // Mensagem do estado atual.
  let statusMsg: string
  if (finished) statusMsg = iWon ? 'Ganhaste o combate! 🎉' : 'Perdeste o combate.'
  else if (myAction != null && oppAction == null) statusMsg = 'À espera do adversário…'
  else if (myAction != null && oppAction != null) statusMsg = 'A resolver o turno…'
  else statusMsg = 'Escolhe o teu ataque!'

  const send = (action: Parameters<typeof submitAction>[2]) => {
    playSfx(action.kind === 'switch' ? SFX.swap : SFX.select)
    setSwitching(false)
    void submitAction(battle.id, mySide, action)
  }

  // Últimas ações do turno mais recente (para dar vida ao log).
  const lastTurnNo = battle.turns.length - 1
  const lastActions = state.log.filter((l) => l.turn === lastTurnNo)

  return (
    <div className="screen battle">
      {header}
      <div className="pkmn">
        <div className="pkmn__scene">
          <InfoBox className="pkmn__info pkmn__info--foe" f={foe} team={foeTeam} showNumbers />
          <div className={'pkmn__mon pkmn__mon--foe' + (foe.hp <= 0 ? ' is-fainted' : '')}>
            <div className="pkmn__platform" />
            <Avatar name={foe.name} type={foe.types[0]} size={96} ring />
          </div>
          <div className={'pkmn__mon pkmn__mon--ally' + (ally.hp <= 0 ? ' is-fainted' : '')}>
            <div className="pkmn__platform" />
            <Avatar name={ally.name} type={ally.types[0]} size={112} ring />
          </div>
          <InfoBox className="pkmn__info pkmn__info--ally" f={ally} team={allyTeam} showNumbers />
        </div>

        <div className="pkmn__ui">
          {canAct && mustSwitch ? (
            <SwitchMenu
              team={allyTeam}
              options={bench}
              forced
              onPick={(to) => send({ kind: 'switch', to })}
            />
          ) : canAct && switching ? (
            <SwitchMenu
              team={allyTeam}
              options={bench}
              onPick={(to) => send({ kind: 'switch', to })}
              onCancel={() => setSwitching(false)}
            />
          ) : canAct ? (
            <>
              <MoveMenu
                f={ally}
                hover={hover}
                onHover={setHover}
                onPick={(i) => send({ kind: 'move', index: i })}
              />
              {bench.length > 0 && (
                <button className="switch-cta" onClick={() => setSwitching(true)}>
                  <Repeat size={15} /> Trocar de lutador
                </button>
              )}
            </>
          ) : (
            <div className="pkmn__msg">
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {lastActions.length > 0 && !canAct && (
          <div className="live-log">
            {lastActions.map((l, i) => (
              <div className="live-log__row" key={i}>
                <strong>{first(l.actor)}</strong>{' '}
                {l.kind === 'switch' ? (
                  'entrou em campo'
                ) : (
                  <>
                    usou{' '}
                    <span style={{ color: getType(l.moveType).color, fontWeight: 800 }}>
                      {l.moveName}
                    </span>
                    {l.category === 'estatuto' ? ` (+${l.heal} HP)` : ` — ${l.damage} dano`}
                    {l.fainted && ' 💥 KO!'}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {finished && (
        <>
          <div className="battle-reward">
            <Trophy size={18} />{' '}
            {iWon ? 'A tua equipa venceu e ganhou XP!' : 'Não foi desta.'}
          </div>
          <div className="battle-controls">
            <button className="btn btn--primary" onClick={() => navigate('/')}>
              <X size={16} /> Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}
