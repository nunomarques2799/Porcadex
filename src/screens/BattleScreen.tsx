import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, X, Search, Swords, RotateCcw } from 'lucide-react'
import { usePeople } from '../store/people'
import type { Person } from '../types'
import { typeTheme, getType } from '../data/pokeTypes'
import {
  buildFighter,
  aiChooseMove,
  resolveMove,
  moveMaxPp,
  effectivenessNote,
  battleStatTotal,
  personBattleStats,
  STRUGGLE,
  type Fighter,
  type Move,
} from '../data/battle'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { TypeBadge } from '../components/TypeBadge'

type Phase = 'busy' | 'choose' | 'over'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function hpColor(pct: number): string {
  if (pct > 0.5) return '#58d860'
  if (pct > 0.2) return '#f8d030'
  return '#f85038'
}

export function BattleScreen() {
  const { people } = usePeople()
  const navigate = useNavigate()

  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)
  const [picking, setPicking] = useState<null | 'a' | 'b'>(null)

  const a = aId ? people.find((p) => p.id === aId) ?? null : null
  const b = bId ? people.find((p) => p.id === bId) ?? null : null

  // Estado do combate ---------------------------------------------------
  const [started, setStarted] = useState(false)
  const fA = useRef<Fighter | null>(null)
  const fB = useRef<Fighter | null>(null)
  const runId = useRef(0)

  const [hpA, setHpA] = useState(0)
  const [hpB, setHpB] = useState(0)
  const [pp, setPP] = useState<number[]>([])
  const [maxPP, setMaxPP] = useState<number[]>([])
  const [phase, setPhase] = useState<Phase>('choose')
  const [message, setMessage] = useState('')
  const [hover, setHover] = useState(0)

  // Invalida qualquer sequência em curso ao desmontar.
  useEffect(() => () => void (runId.current++), [])

  const aName = a?.name.split(' ')[0] ?? ''
  const bName = b?.name.split(' ')[0] ?? ''

  /** Mostra uma mensagem e espera; devolve false se a batalha foi reiniciada. */
  const say = async (text: string, my: number, ms = 1150) => {
    setMessage(text)
    await sleep(ms)
    return runId.current === my
  }

  const runIntro = async (my: number) => {
    setPhase('busy')
    if (!(await say(`${bName} quer combater!`, my, 1000)) || !(await say(`Vai, ${aName}!`, my, 900)))
      return
    setPhase('choose')
    setMessage(`O que vai ${aName} fazer?`)
  }

  const startBattle = () => {
    if (!a || !b) return
    runId.current++
    const my = runId.current
    fA.current = buildFighter(a)
    fB.current = buildFighter(b)
    setHpA(fA.current.maxHp)
    setHpB(fB.current.maxHp)
    setPP(fA.current.moves.map(moveMaxPp))
    setMaxPP(fA.current.moves.map(moveMaxPp))
    setHover(0)
    setStarted(true)
    void runIntro(my)
  }

  const leaveBattle = () => {
    runId.current++
    setStarted(false)
    setPhase('choose')
    setMessage('')
  }

  const pick = (id: string) => {
    if (picking === 'a') setAId(id)
    else if (picking === 'b') setBId(id)
    setPicking(null)
  }

  /** O jogador escolhe um ataque; resolve o turno completo (jogador + IA). */
  const playerMove = async (i: number) => {
    if (phase !== 'choose' || !fA.current || !fB.current) return
    const av = fA.current
    const bv = fB.current
    const my = runId.current

    const allOut = pp.every((v) => v <= 0)
    const outOfThis = pp[i] <= 0
    if (outOfThis && !allOut) return

    const pMove = outOfThis && allOut ? STRUGGLE : av.moves[i]
    if (!(outOfThis && allOut)) {
      setPP((prev) => {
        const n = [...prev]
        n[i] = Math.max(0, n[i] - 1)
        return n
      })
    }
    const oMove = aiChooseMove(bv, av)

    setPhase('busy')

    const playerFirst =
      av.spe > bv.spe || (av.spe === bv.spe && Math.random() < 0.5)
    const seq: { who: 'a' | 'b'; mv: Move }[] = playerFirst
      ? [
          { who: 'a', mv: pMove },
          { who: 'b', mv: oMove },
        ]
      : [
          { who: 'b', mv: oMove },
          { who: 'a', mv: pMove },
        ]

    for (const { who, mv } of seq) {
      const atk = who === 'a' ? av : bv
      const def = who === 'a' ? bv : av
      if (atk.hp <= 0) continue
      const nm = who === 'a' ? aName : bName

      if (!(await say(`${nm} usou ${mv.name}!`, my))) return
      const res = resolveMove(atk, def, mv)
      setHpA(av.hp)
      setHpB(bv.hp)
      await sleep(520)
      if (runId.current !== my) return

      if (mv.category === 'estatuto') {
        if (!(await say(`${nm} recompôs-se! (+${res.heal} HP)`, my))) return
      } else {
        const note = effectivenessNote(res.effectiveness).text
        if (note && !(await say(note, my))) return
      }

      if (res.fainted) {
        const loser = who === 'a' ? bName : aName
        if (!(await say(`${loser} foi derrotado/a!`, my, 1000)) || runId.current !== my) return
        setPhase('over')
        setMessage(`${who === 'a' ? aName : bName} venceu o combate!`)
        return
      }
    }

    setPhase('choose')
    setMessage(`O que vai ${aName} fazer?`)
  }

  // --------------------------------------------------------------------
  // SETUP: escolher os dois lutadores
  // --------------------------------------------------------------------
  if (!started) {
    const accentA = typeTheme(a?.types[0]).accent
    const accentB = typeTheme(b?.types[0]).accent
    return (
      <div className="screen battle">
        <header className="edit__bar">
          <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
            <ChevronLeft size={24} />
          </button>
          <h1 className="edit__title">
            <Swords size={18} /> Combate
          </h1>
          <span style={{ width: 42 }} />
        </header>

        <div className="arena">
          <SetupSlot person={a} accent={accentA} onPick={() => setPicking('a')} side="a" />
          <span className="arena__vs">VS</span>
          <SetupSlot person={b} accent={accentB} onPick={() => setPicking('b')} side="b" />
        </div>

        {a && b ? (
          <div className="battle-controls">
            <button className="btn btn--primary btn--fight" onClick={startBattle}>
              <Swords size={18} /> Lutar!
            </button>
          </div>
        ) : (
          <p className="muted-block">Escolhe dois lutadores para o combate.</p>
        )}

        {picking && (
          <BattlePicker
            people={people}
            excludeId={picking === 'a' ? bId : aId}
            onClose={() => setPicking(null)}
            onSelect={pick}
          />
        )}
      </div>
    )
  }

  // --------------------------------------------------------------------
  // COMBATE: cena estilo Pokémon
  // --------------------------------------------------------------------
  const fa = fA.current!
  const fb = fB.current!
  const previewMove = fa.moves[hover] ?? fa.moves[0]
  const pt = getType(previewMove.type)
  const allOut = pp.every((v) => v <= 0)

  return (
    <div className="screen battle">
      <header className="edit__bar">
        <button className="iconbtn" onClick={leaveBattle} aria-label="Sair do combate">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">
          <Swords size={18} /> Combate
        </h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="pkmn">
        <div className="pkmn__scene">
          {/* Adversário (cima) */}
          <InfoBox className="pkmn__info pkmn__info--foe" name={fb.name} level={fb.level} hp={hpB} maxHp={fb.maxHp} showNumbers />
          <div className={'pkmn__mon pkmn__mon--foe' + (hpB <= 0 ? ' is-fainted' : '')}>
            <div className="pkmn__platform" />
            <Avatar name={fb.name} type={fb.types[0]} avatarId={b?.avatarId} size={96} ring />
          </div>

          {/* Jogador (baixo) */}
          <div className={'pkmn__mon pkmn__mon--ally' + (hpA <= 0 ? ' is-fainted' : '')}>
            <div className="pkmn__platform" />
            <Avatar name={fa.name} type={fa.types[0]} avatarId={a?.avatarId} size={112} ring />
          </div>
          <InfoBox className="pkmn__info pkmn__info--ally" name={fa.name} level={fa.level} hp={hpA} maxHp={fa.maxHp} showNumbers />
        </div>

        {/* Painel inferior: mensagem OU menu de ataques */}
        <div className="pkmn__ui">
          {phase === 'choose' ? (
            <div className="move-menu">
              <div className="move-menu__moves">
                {fa.moves.map((m, i) => {
                  const out = pp[i] <= 0 && !allOut
                  return (
                    <button
                      key={m.name}
                      className={'move-cell' + (hover === i ? ' is-hover' : '')}
                      disabled={out}
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onClick={() => void playerMove(i)}
                    >
                      <span className="move-cell__cursor">{hover === i ? '▶' : ''}</span>
                      {m.name}
                    </button>
                  )
                })}
              </div>
              <div className="move-menu__side">
                <div className="move-menu__pp">
                  PP <b>{pp[hover] ?? 0}/{maxPP[hover] ?? 0}</b>
                </div>
                <div className="move-menu__type" style={{ color: pt.color }}>
                  {pt.label.toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            <div className="pkmn__msg">
              <span>{message}</span>
              {phase === 'busy' && <span className="pkmn__msg-caret">▼</span>}
            </div>
          )}
        </div>
      </div>

      {phase === 'over' && (
        <div className="battle-controls battle-controls--over">
          <button className="btn btn--ghost" onClick={leaveBattle}>
            <X size={16} /> Trocar
          </button>
          <button className="btn btn--primary" onClick={startBattle}>
            <RotateCcw size={16} /> Revanche
          </button>
        </div>
      )}
    </div>
  )
}

function InfoBox({
  className,
  name,
  level,
  hp,
  maxHp,
  showNumbers,
}: {
  className?: string
  name: string
  level: number
  hp: number
  maxHp: number
  showNumbers?: boolean
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0
  return (
    <div className={'info-box' + (className ? ' ' + className : '')}>
      <div className="info-box__top">
        <span className="info-box__name">{name}</span>
        <span className="info-box__lv">Nv{level}</span>
      </div>
      <div className="info-box__hprow">
        <span className="info-box__hplabel">HP</span>
        <div className="info-box__hptrack">
          <div
            className="info-box__hpfill"
            style={{ width: `${pct * 100}%`, background: hpColor(pct) }}
          />
        </div>
      </div>
      {showNumbers && (
        <div className="info-box__num">
          {Math.max(0, hp)}/{maxHp}
        </div>
      )}
    </div>
  )
}

function SetupSlot({
  person,
  accent,
  onPick,
  side,
}: {
  person: Person | null
  accent: string
  onPick: () => void
  side: 'a' | 'b'
}) {
  if (!person) {
    return (
      <button className={'fighter fighter--' + side + ' fighter--empty'} onClick={onPick}>
        <span className="fighter__add">
          <Plus size={26} />
        </span>
        <span className="fighter__pick">Escolher</span>
      </button>
    )
  }
  const bst = battleStatTotal(personBattleStats(person))
  return (
    <div className={'fighter fighter--' + side}>
      <button className="fighter__avatar" onClick={onPick} aria-label="Trocar">
        <Avatar name={person.name} type={person.types[0]} avatarId={person.avatarId} size={80} ring />
      </button>
      <span className="fighter__name">{person.name.split(' ')[0]}</span>
      <div className="fighter__types">
        {person.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
      <span className="fighter__bst" style={{ color: accent }}>
        {formatNumber(person.number)} · {bst} pts
      </span>
    </div>
  )
}

function BattlePicker({
  people,
  excludeId,
  onClose,
  onSelect,
}: {
  people: Person[]
  excludeId: string | null
  onClose: () => void
  onSelect: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const list = people.filter(
    (p) =>
      p.id !== excludeId && p.name.toLowerCase().includes(q.trim().toLowerCase()),
  )

  return (
    <div className="picker" role="dialog" aria-modal="true">
      <div className="picker__scrim" onClick={onClose} />
      <div className="picker__sheet">
        <div className="picker__head">
          <h2>Escolher lutador</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <div className="searchbar">
          <Search size={18} />
          <input
            type="search"
            placeholder="Procurar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="picker__list">
          {list.map((p) => (
            <li key={p.id}>
              <button className="picker__item" onClick={() => onSelect(p.id)}>
                <Avatar name={p.name} type={p.types[0]} avatarId={p.avatarId} size={40} />
                <span className="picker__item-name">{p.name}</span>
                <span className="picker__item-num">{formatNumber(p.number)}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <p className="muted-block">Sem pessoas.</p>}
        </ul>
      </div>
    </div>
  )
}
