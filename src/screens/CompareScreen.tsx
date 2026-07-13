import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, X, Search } from 'lucide-react'
import { usePeople } from '../store/people'
import type { Person } from '../types'
import { STAT_META } from '../types'
import { typeTheme } from '../data/pokeTypes'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { RatingStars } from '../components/RatingStars'

export function CompareScreen() {
  const { people } = usePeople()
  const navigate = useNavigate()
  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)
  const [picking, setPicking] = useState<null | 'a' | 'b'>(null)

  const a = people.find((p) => p.id === aId) ?? null
  const b = people.find((p) => p.id === bId) ?? null

  const tally = useMemo(() => {
    if (!a || !b) return { a: 0, b: 0, tie: 0 }
    let wa = 0
    let wb = 0
    let tie = 0
    for (const s of STAT_META) {
      const va = a.stats[s.key]
      const vb = b.stats[s.key]
      if (va > vb) wa++
      else if (vb > va) wb++
      else tie++
    }
    return { a: wa, b: wb, tie }
  }, [a, b])

  const pick = (person: Person) => {
    if (picking === 'a') setAId(person.id)
    else if (picking === 'b') setBId(person.id)
    setPicking(null)
  }

  const accentA = typeTheme(a?.types[0]).accent
  const accentB = typeTheme(b?.types[0]).accent

  return (
    <div className="screen compare">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">Comparar</h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="cmp-slots">
        <Slot person={a} onPick={() => setPicking('a')} accent={accentA} />
        <span className="cmp-vs">VS</span>
        <Slot person={b} onPick={() => setPicking('b')} accent={accentB} />
      </div>

      {a && b ? (
        <div className="cmp-result">
          <div className="cmp-tally">
            <span className="cmp-tally__side" style={{ color: accentA }}>
              {tally.a}
            </span>
            <span className="cmp-tally__mid">
              {tally.a === tally.b
                ? 'Empate'
                : tally.a > tally.b
                  ? `${a.name.split(' ')[0]} vence`
                  : `${b.name.split(' ')[0]} vence`}
              {tally.tie > 0 && <small> · {tally.tie} empate(s)</small>}
            </span>
            <span className="cmp-tally__side" style={{ color: accentB }}>
              {tally.b}
            </span>
          </div>

          <div className="cmp-overall">
            <RatingStars value={a.rating} size={15} color={accentA} />
            <span className="cmp-overall__label">Avaliação</span>
            <RatingStars value={b.rating} size={15} color={accentB} />
          </div>

          {STAT_META.map((s) => {
            const va = a.stats[s.key]
            const vb = b.stats[s.key]
            return (
              <div className="cmp-stat" key={s.key}>
                <div className="cmp-stat__label">{s.label}</div>
                <div className="cmp-stat__row">
                  <span className={'cmp-stat__val' + (va > vb ? ' is-win' : '')}>{va}</span>
                  <div className="cmp-bars">
                    <div className="cmp-bars__side cmp-bars__side--a">
                      <div className="cmp-bars__fill" style={{ width: `${va}%`, background: accentA }} />
                    </div>
                    <div className="cmp-bars__side cmp-bars__side--b">
                      <div className="cmp-bars__fill" style={{ width: `${vb}%`, background: accentB }} />
                    </div>
                  </div>
                  <span className={'cmp-stat__val' + (vb > va ? ' is-win' : '')}>{vb}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="muted-block">Escolhe duas pessoas para comparar.</p>
      )}

      {picking && (
        <PersonPicker
          people={people.filter((p) => p.id !== (picking === 'a' ? bId : aId))}
          onClose={() => setPicking(null)}
          onSelect={pick}
        />
      )}
    </div>
  )
}

function Slot({
  person,
  onPick,
  accent,
}: {
  person: Person | null
  onPick: () => void
  accent: string
}) {
  return (
    <button className="cmp-slot" onClick={onPick}>
      {person ? (
        <>
          <Avatar name={person.name} type={person.types[0]} avatarId={person.avatarId} size={72} ring />
          <span className="cmp-slot__name">{person.name}</span>
          <span className="cmp-slot__num" style={{ color: accent }}>
            {formatNumber(person.number)}
          </span>
        </>
      ) : (
        <>
          <span className="cmp-slot__add">
            <Plus size={26} />
          </span>
          <span className="cmp-slot__name">Escolher</span>
        </>
      )}
    </button>
  )
}

function PersonPicker({
  people,
  onClose,
  onSelect,
}: {
  people: Person[]
  onClose: () => void
  onSelect: (p: Person) => void
}) {
  const [q, setQ] = useState('')
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="picker" role="dialog" aria-modal="true">
      <div className="picker__scrim" onClick={onClose} />
      <div className="picker__sheet">
        <div className="picker__head">
          <h2>Escolher pessoa</h2>
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
              <button className="picker__item" onClick={() => onSelect(p)}>
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
