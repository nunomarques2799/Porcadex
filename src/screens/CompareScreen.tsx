import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Plus, X, Search } from 'lucide-react'
import { usePeople } from '../store/people'
import { useFriends } from '../lib/friends'
import { useFriendPeople } from '../lib/friendPeople'
import type { Person, PublicPerson } from '../types'
import { STAT_META } from '../types'
import { typeTheme } from '../data/pokeTypes'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { RatingStars } from '../components/RatingStars'

/** A reference to either one of my people or a friend's public person. */
interface Ref {
  source: 'me' | string // 'me' or friend user id
  id: string
}

/** Everything we need to render a slot side-by-side. Both Person and
 *  PublicPerson satisfy this. */
type Any = Person | PublicPerson

export function CompareScreen() {
  const { people: myPeople } = usePeople()
  const { friends } = useFriends()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [aRef, setARef] = useState<Ref | null>(null)
  const [bRef, setBRef] = useState<Ref | null>(null)
  const [picking, setPicking] = useState<null | 'a' | 'b'>(null)

  // Deep-link: /compare?friend=<id>&fp=<personId> pre-fills slot B with that
  // friend's person (or leaves it open for the user to pick).
  useEffect(() => {
    const friendId = searchParams.get('friend')
    const fp = searchParams.get('fp')
    if (friendId && fp && !bRef) setBRef({ source: friendId, id: fp })
  }, [searchParams, bRef])

  // Load public people for any friend referenced by slot A or B.
  const friendIds = useMemo(() => {
    const s = new Set<string>()
    if (aRef && aRef.source !== 'me') s.add(aRef.source)
    if (bRef && bRef.source !== 'me') s.add(bRef.source)
    return Array.from(s)
  }, [aRef, bRef])

  const friendA = useFriendPeople(friendIds[0])
  const friendB = useFriendPeople(friendIds[1])

  const friendPeopleById: Record<string, PublicPerson[]> = {}
  if (friendIds[0]) friendPeopleById[friendIds[0]] = friendA.people
  if (friendIds[1]) friendPeopleById[friendIds[1]] = friendB.people

  const resolve = (ref: Ref | null): Any | null => {
    if (!ref) return null
    if (ref.source === 'me') return myPeople.find((p) => p.id === ref.id) ?? null
    return friendPeopleById[ref.source]?.find((p) => p.id === ref.id) ?? null
  }

  const a = resolve(aRef)
  const b = resolve(bRef)

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

  const pick = (ref: Ref) => {
    if (picking === 'a') setARef(ref)
    else if (picking === 'b') setBRef(ref)
    setPicking(null)
  }

  const accentA = typeTheme(a?.types[0]).accent
  const accentB = typeTheme(b?.types[0]).accent

  const otherRef = picking === 'a' ? bRef : aRef

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
        <Slot person={a} ownerRef={aRef} onPick={() => setPicking('a')} accent={accentA} />
        <span className="cmp-vs">VS</span>
        <Slot person={b} ownerRef={bRef} onPick={() => setPicking('b')} accent={accentB} />
      </div>

      {a && b ? (
        <div className="cmp-result">
          <div className="cmp-tally">
            <span className="cmp-tally__side" style={{ color: accentA }}>{tally.a}</span>
            <span className="cmp-tally__mid">
              {tally.a === tally.b
                ? 'Empate'
                : tally.a > tally.b
                  ? `${a.name.split(' ')[0]} vence`
                  : `${b.name.split(' ')[0]} vence`}
              {tally.tie > 0 && <small> · {tally.tie} empate(s)</small>}
            </span>
            <span className="cmp-tally__side" style={{ color: accentB }}>{tally.b}</span>
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
          myPeople={myPeople}
          friends={friends}
          friendPeopleById={friendPeopleById}
          excludeRef={otherRef}
          onClose={() => setPicking(null)}
          onSelect={pick}
        />
      )}
    </div>
  )
}

function Slot({
  person,
  ownerRef,
  onPick,
  accent,
}: {
  person: Any | null
  ownerRef: Ref | null
  onPick: () => void
  accent: string
}) {
  const ownerId = ownerRef && ownerRef.source !== 'me' ? ownerRef.source : undefined
  return (
    <button className="cmp-slot" onClick={onPick}>
      {person ? (
        <>
          <Avatar
            name={person.name}
            type={person.types[0]}
            avatarId={person.avatarId}
            ownerId={ownerId}
            size={72}
            ring
          />
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

interface FriendMeta {
  id: string
  name: string
}

function PersonPicker({
  myPeople,
  friends,
  friendPeopleById,
  excludeRef,
  onClose,
  onSelect,
}: {
  myPeople: Person[]
  friends: FriendMeta[]
  friendPeopleById: Record<string, PublicPerson[]>
  excludeRef: Ref | null
  onClose: () => void
  onSelect: (ref: Ref) => void
}) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<string>('me') // 'me' or friend id
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)

  // Load a friend's list on-demand when their tab is selected and it's not
  // already cached from being one of the compared slots.
  const onDemand = useFriendPeople(selectedFriend ?? undefined)

  const activeFriendId = tab === 'me' ? null : tab
  const activePeople: Any[] = activeFriendId
    ? friendPeopleById[activeFriendId] ?? (selectedFriend === activeFriendId ? onDemand.people : [])
    : myPeople

  const list = activePeople.filter((p) => {
    if (
      excludeRef &&
      p.id === excludeRef.id &&
      ((excludeRef.source === 'me' && tab === 'me') ||
        excludeRef.source === activeFriendId)
    ) {
      return false
    }
    return p.name.toLowerCase().includes(q.trim().toLowerCase())
  })

  const selectTab = (id: string) => {
    setTab(id)
    if (id !== 'me' && !friendPeopleById[id]) setSelectedFriend(id)
  }

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
        {friends.length > 0 && (
          <div className="picker__tabs">
            <button
              className={'picker__tab' + (tab === 'me' ? ' is-active' : '')}
              onClick={() => selectTab('me')}
            >
              Minhas
            </button>
            {friends.map((f) => (
              <button
                key={f.id}
                className={'picker__tab' + (tab === f.id ? ' is-active' : '')}
                onClick={() => selectTab(f.id)}
              >
                {f.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
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
              <button
                className="picker__item"
                onClick={() => onSelect({ source: tab, id: p.id })}
              >
                <Avatar
                  name={p.name}
                  type={p.types[0]}
                  avatarId={p.avatarId}
                  ownerId={activeFriendId ?? undefined}
                  size={40}
                />
                <span className="picker__item-name">{p.name}</span>
                <span className="picker__item-num">{formatNumber(p.number)}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <p className="muted-block">
              {onDemand.loading && selectedFriend === activeFriendId
                ? 'A carregar…'
                : 'Sem pessoas.'}
            </p>
          )}
        </ul>
      </div>
    </div>
  )
}
