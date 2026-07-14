import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, X, Search, Swords, Trophy, RotateCcw, Zap } from 'lucide-react'
import { usePeople } from '../store/people'
import type { Person } from '../types'
import { typeTheme, getType } from '../data/pokeTypes'
import {
  simulateBattle,
  battleStatTotal,
  personBattleStats,
  type BattleResult,
} from '../data/battle'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { TypeBadge } from '../components/TypeBadge'

const STEP_MS = 1100

function hpColor(pct: number): string {
  if (pct > 0.5) return '#37B98C'
  if (pct > 0.2) return '#F5943C'
  return '#F0563E'
}

export function BattleScreen() {
  const { people } = usePeople()
  const navigate = useNavigate()

  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)
  const [picking, setPicking] = useState<null | 'a' | 'b'>(null)

  const [result, setResult] = useState<BattleResult | null>(null)
  const [step, setStep] = useState(-1) // -1 = antes do 1º ataque
  const [playing, setPlaying] = useState(false)

  const a = aId ? people.find((p) => p.id === aId) ?? null : null
  const b = bId ? people.find((p) => p.id === bId) ?? null : null

  const accentA = typeTheme(a?.types[0]).accent
  const accentB = typeTheme(b?.types[0]).accent

  const logRef = useRef<HTMLDivElement>(null)

  // Playback: avança um turno de cada vez enquanto estiver a jogar.
  useEffect(() => {
    if (!playing || !result) return
    if (step >= result.turns.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step, result])

  // Auto-scroll do log.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [step])

  const startFight = () => {
    if (!a || !b) return
    setResult(simulateBattle(a, b))
    setStep(-1)
    setPlaying(true)
  }

  const reset = () => {
    setResult(null)
    setStep(-1)
    setPlaying(false)
  }

  const pick = (id: string) => {
    if (picking === 'a') setAId(id)
    else if (picking === 'b') setBId(id)
    setPicking(null)
    reset()
  }

  // HP atual conforme o passo de playback.
  const cur = result
    ? step >= 0
      ? result.turns[step]
      : { aHp: result.a.maxHp, bHp: result.b.maxHp }
    : null
  const aHp = cur ? cur.aHp : result?.a.maxHp ?? 0
  const bHp = cur ? cur.bHp : result?.b.maxHp ?? 0
  const aMax = result?.a.maxHp ?? 1
  const bMax = result?.b.maxHp ?? 1

  const finished = !!result && !playing && step >= result.turns.length - 1
  const lastTurn = result && step >= 0 ? result.turns[step] : null
  const shownTurns = result ? result.turns.slice(0, step + 1) : []

  const winnerName =
    finished && result
      ? result.winner === 'a'
        ? a?.name
        : result.winner === 'b'
          ? b?.name
          : null
      : null

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

      {/* Arena */}
      <div className="arena">
        <FighterSide
          person={a}
          accent={accentA}
          hp={aHp}
          maxHp={aMax}
          showHp={!!result}
          onPick={() => setPicking('a')}
          side="a"
          active={playing && lastTurn?.attacker === 'a'}
        />
        <div className="arena__vs">
          <Zap size={22} />
          <span>VS</span>
        </div>
        <FighterSide
          person={b}
          accent={accentB}
          hp={bHp}
          maxHp={bMax}
          showHp={!!result}
          onPick={() => setPicking('b')}
          side="b"
          active={playing && lastTurn?.attacker === 'b'}
        />
      </div>

      {/* Ação atual */}
      {result && lastTurn && (
        <ActionBanner
          turn={lastTurn}
          aName={a?.name ?? ''}
          bName={b?.name ?? ''}
        />
      )}

      {/* Vencedor */}
      {finished && (
        <div className="battle-winner">
          {winnerName ? (
            <>
              <Trophy size={26} />
              <span>
                <strong>{winnerName}</strong> venceu!
              </span>
            </>
          ) : (
            <span>Empate renhido!</span>
          )}
        </div>
      )}

      {/* Controlos */}
      {a && b && (
        <div className="battle-controls">
          {!result || finished ? (
            <button className="btn btn--primary btn--fight" onClick={startFight}>
              {finished ? (
                <>
                  <RotateCcw size={18} /> Repetir
                </>
              ) : (
                <>
                  <Swords size={18} /> Lutar!
                </>
              )}
            </button>
          ) : (
            <button className="btn btn--ghost btn--fight" disabled>
              A lutar…
            </button>
          )}
        </div>
      )}

      {/* Log */}
      {result && shownTurns.length > 0 && (
        <div className="battle-log" ref={logRef}>
          {shownTurns.map((t, i) => {
            const name = t.attacker === 'a' ? a?.name : b?.name
            const tt = getType(t.moveType)
            return (
              <div className="battle-log__row" key={i}>
                <span
                  className="battle-log__dot"
                  style={{ background: t.attacker === 'a' ? accentA : accentB }}
                />
                <span className="battle-log__text">
                  <strong>{name?.split(' ')[0]}</strong> usou{' '}
                  <span style={{ color: tt.color, fontWeight: 800 }}>{t.moveName}</span>
                  {t.category === 'estatuto' ? (
                    <> e recuperou {t.heal} HP.</>
                  ) : (
                    <>
                      {' '}— {t.damage} de dano.
                      {t.note && (
                        <em
                          className={
                            'battle-log__eff' +
                            (t.effectiveness >= 2
                              ? ' is-super'
                              : t.effectiveness > 0 && t.effectiveness < 1
                                ? ' is-weak'
                                : t.effectiveness === 0
                                  ? ' is-none'
                                  : '')
                          }
                        >
                          {' '}
                          {t.note}
                        </em>
                      )}
                    </>
                  )}
                  {t.fainted && <> 💥 KO!</>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!a || !b ? (
        <p className="muted-block">Escolhe duas pessoas e vê quem ganha.</p>
      ) : null}

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

function FighterSide({
  person,
  accent,
  hp,
  maxHp,
  showHp,
  onPick,
  side,
  active,
}: {
  person: Person | null
  accent: string
  hp: number
  maxHp: number
  showHp: boolean
  onPick: () => void
  side: 'a' | 'b'
  active: boolean
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0
  const bst = person ? battleStatTotal(personBattleStats(person)) : 0

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

  return (
    <div className={'fighter fighter--' + side + (active ? ' is-active' : '')}>
      <button className="fighter__avatar" onClick={onPick} aria-label="Trocar">
        <Avatar
          name={person.name}
          type={person.types[0]}
          avatarId={person.avatarId}
          size={72}
          ring
        />
      </button>
      <span className="fighter__name">{person.name.split(' ')[0]}</span>
      <div className="fighter__types">
        {person.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
      {showHp ? (
        <div className="hpbar">
          <div className="hpbar__track">
            <div
              className="hpbar__fill"
              style={{ width: `${pct * 100}%`, background: hpColor(pct) }}
            />
          </div>
          <span className="hpbar__num">
            {hp}/{maxHp}
          </span>
        </div>
      ) : (
        <span className="fighter__bst" style={{ color: accent }}>
          {formatNumber(person.number)} · {bst} pts
        </span>
      )}
    </div>
  )
}

function ActionBanner({
  turn,
  aName,
  bName,
}: {
  turn: BattleResult['turns'][number]
  aName: string
  bName: string
}) {
  const name = (turn.attacker === 'a' ? aName : bName).split(' ')[0]
  const t = getType(turn.moveType)
  return (
    <div className="action-banner" style={{ borderColor: t.color }}>
      <span className="action-banner__who">{name}</span>
      <span className="action-banner__move" style={{ color: t.color }}>
        {turn.moveName}
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
