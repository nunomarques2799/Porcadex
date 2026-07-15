import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Swords, Trophy, X } from 'lucide-react'
import { usePeople } from '../store/people'
import { useAuth } from '../lib/auth'
import { useBattle, sideOf, submitMove, commitTurnIfReady, setBattleStatus } from '../lib/battles'
import { getType } from '../data/pokeTypes'
import { replayPvp, applyBattleResult, type Fighter } from '../data/battle'
import { Avatar } from '../components/Avatar'

function hpColor(pct: number): string {
  if (pct > 0.5) return '#58d860'
  if (pct > 0.2) return '#f8d030'
  return '#f85038'
}

export function LiveBattleScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { people, updatePerson } = usePeople()
  const { battle, loading } = useBattle(id)

  const mySide = battle && user ? sideOf(battle, user.id) : 'a'

  // Estado derivado (determinístico) a partir de setup + turnos.
  const state = useMemo(() => {
    if (!battle || !battle.setup.a || !battle.setup.b) return null
    return replayPvp({ a: battle.setup.a, b: battle.setup.b }, Number(battle.seed), battle.turns)
  }, [battle])

  // Host (desafiante) consolida o turno quando ambas as jogadas chegam.
  useEffect(() => {
    if (!battle || mySide !== 'a') return
    if (battle.status === 'active' && battle.move_a != null && battle.move_b != null) {
      void commitTurnIfReady(battle)
    }
  }, [battle, mySide])

  // Ao terminar, cada cliente aplica XP à SUA pessoa (uma vez).
  useEffect(() => {
    if (!battle || battle.status !== 'finished' || !user) return
    const key = 'porcadex-pvp-applied-' + battle.id
    if (localStorage.getItem(key)) return
    const myPersonId = mySide === 'a' ? battle.challenger_person : battle.opponent_person
    const mine = people.find((p) => p.id === myPersonId)
    if (!mine) return
    const foe = mySide === 'a' ? battle.setup.b : battle.setup.a
    const iWon = battle.winner === user.id
    const { battle: nb } = applyBattleResult(mine.battle, iWon, foe?.level ?? 1)
    void updatePerson(mine.id, { battle: nb })
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
        <Swords size={18} /> Combate ao vivo
      </h1>
      <span style={{ width: 42 }} />
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

  if (!state || !battle.setup.a || !battle.setup.b) {
    return (
      <div className="screen battle">
        {header}
        <p className="muted-block">A preparar o combate…</p>
      </div>
    )
  }

  // Perspetiva: a MINHA pessoa em baixo, o adversário em cima.
  const ally: Fighter = mySide === 'a' ? state.a : state.b
  const foe: Fighter = mySide === 'a' ? state.b : state.a
  const myMove = mySide === 'a' ? battle.move_a : battle.move_b
  const oppMove = mySide === 'a' ? battle.move_b : battle.move_a
  const finished = battle.status === 'finished'
  const iWon = finished && battle.winner === user?.id

  // Mensagem do estado atual.
  let statusMsg: string
  if (finished) statusMsg = iWon ? 'Ganhaste o combate! 🎉' : 'Perdeste o combate.'
  else if (myMove != null && oppMove == null) statusMsg = 'À espera do adversário…'
  else if (myMove != null && oppMove != null) statusMsg = 'A resolver o turno…'
  else statusMsg = 'Escolhe o teu ataque!'

  // Últimas ações do turno mais recente (para dar vida ao log).
  const lastTurnNo = battle.turns.length - 1
  const lastActions = state.log.filter((l) => l.turn === lastTurnNo)

  const canChoose = !finished && myMove == null

  return (
    <div className="screen battle">
      {header}
      <div className="pkmn">
        <div className="pkmn__scene">
          <LiveInfo className="pkmn__info pkmn__info--foe" f={foe} showNumbers />
          <div className={'pkmn__mon pkmn__mon--foe' + (foe.hp <= 0 ? ' is-fainted' : '')}>
            <div className="pkmn__platform" />
            <Avatar name={foe.name} type={foe.types[0]} size={96} ring />
          </div>
          <div className={'pkmn__mon pkmn__mon--ally' + (ally.hp <= 0 ? ' is-fainted' : '')}>
            <div className="pkmn__platform" />
            <Avatar name={ally.name} type={ally.types[0]} size={112} ring />
          </div>
          <LiveInfo className="pkmn__info pkmn__info--ally" f={ally} showNumbers />
        </div>

        <div className="pkmn__ui">
          {canChoose ? (
            <div className="move-menu move-menu--live">
              <div className="move-menu__moves">
                {ally.moves.map((m, i) => {
                  const mt = getType(m.type)
                  return (
                    <button
                      key={m.name}
                      className="move-cell"
                      style={{ ['--mv' as string]: mt.color }}
                      onClick={() => void submitMove(battle.id, mySide, i)}
                    >
                      <span className="move-cell__dot" style={{ background: mt.color }} />
                      <span className="move-cell__name">{m.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="pkmn__msg">
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {lastActions.length > 0 && !canChoose && (
          <div className="live-log">
            {lastActions.map((l, i) => (
              <div className="live-log__row" key={i}>
                <strong>{l.who === mySide ? ally.name.split(' ')[0] : foe.name.split(' ')[0]}</strong>{' '}
                usou <span style={{ color: getType(l.moveType).color, fontWeight: 800 }}>{l.moveName}</span>
                {l.category === 'estatuto' ? ` (+${l.heal} HP)` : ` — ${l.damage} dano`}
                {l.fainted && ' 💥 KO!'}
              </div>
            ))}
          </div>
        )}
      </div>

      {finished && (
        <>
          <div className="battle-reward">
            <Trophy size={18} /> {iWon ? `${ally.name.split(' ')[0]} venceu e ganhou XP!` : 'Não foi desta.'}
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

function LiveInfo({ className, f, showNumbers }: { className?: string; f: Fighter; showNumbers?: boolean }) {
  const pct = f.maxHp > 0 ? Math.max(0, Math.min(1, f.hp / f.maxHp)) : 0
  return (
    <div className={'info-box' + (className ? ' ' + className : '')}>
      <div className="info-box__top">
        <span className="info-box__name">{f.name}</span>
        <span className="info-box__lv">Nv{f.level}</span>
      </div>
      <div className="info-box__hprow">
        <span className="info-box__hplabel">HP</span>
        <div className="info-box__hptrack">
          <div className="info-box__hpfill" style={{ width: `${pct * 100}%`, background: hpColor(pct) }} />
        </div>
      </div>
      {showNumbers && (
        <div className="info-box__num">
          {Math.max(0, f.hp)}/{f.maxHp}
        </div>
      )}
    </div>
  )
}
