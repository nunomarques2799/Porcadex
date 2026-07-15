import { useState } from 'react'
import { X, Search, Check } from 'lucide-react'
import type { Person, PublicPerson } from '../types'
import { useFriendPeople } from '../lib/friendPeople'
import { Avatar } from './Avatar'

type AnyPerson = Person | PublicPerson

export interface FriendMeta {
  id: string
  name: string
}

/** De onde vem a equipa: as minhas pessoas ou as de um amigo. */
export type TeamSource = 'me' | string

/** Escolhe até `size` pessoas de uma só origem. Misturar donos na mesma
 *  equipa tornaria ambíguo a quem creditar o XP, por isso trocar de
 *  separador limpa a seleção. */
export function TeamPicker({
  title,
  size,
  myPeople,
  friends,
  source,
  selected,
  excludeIds = [],
  onClose,
  onConfirm,
}: {
  title: string
  size: number
  myPeople: Person[]
  /** Vazio = só posso escolher as minhas. */
  friends: FriendMeta[]
  source: TeamSource
  selected: string[]
  /** Ids que não podem ser escolhidos (já estão na outra equipa). */
  excludeIds?: string[]
  onClose: () => void
  onConfirm: (source: TeamSource, ids: string[]) => void
}) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<TeamSource>(source)
  const [ids, setIds] = useState<string[]>(selected)

  const activeFriendId = tab === 'me' ? undefined : tab
  const friendPeople = useFriendPeople(activeFriendId)
  const activePeople: AnyPerson[] = activeFriendId ? friendPeople.people : myPeople

  const switchTab = (t: TeamSource) => {
    if (t === tab) return
    setTab(t)
    setIds([]) // a equipa é de um dono só
  }

  const toggle = (id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= size) return prev
      return [...prev, id]
    })
  }

  const list = activePeople.filter((p) => {
    if (tab === source && excludeIds.includes(p.id)) return false
    return p.name.toLowerCase().includes(q.trim().toLowerCase())
  })

  const full = ids.length >= size

  return (
    <div className="picker" role="dialog" aria-modal="true">
      <div className="picker__scrim" onClick={onClose} />
      <div className="picker__sheet">
        <div className="picker__head">
          <h2>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>

        {friends.length > 0 && (
          <div className="picker__tabs">
            <button
              className={'picker__tab' + (tab === 'me' ? ' is-active' : '')}
              onClick={() => switchTab('me')}
            >
              Minhas
            </button>
            {friends.map((f) => (
              <button
                key={f.id}
                className={'picker__tab' + (tab === f.id ? ' is-active' : '')}
                onClick={() => switchTab(f.id)}
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
          />
        </div>

        <p className="picker__count">
          {ids.length} de {size} {size === 1 ? 'escolhida' : 'escolhidas'}
        </p>

        <ul className="picker__list">
          {list.map((p) => {
            const i = ids.indexOf(p.id)
            const on = i !== -1
            return (
              <li key={p.id}>
                <button
                  className={'picker__item' + (on ? ' is-picked' : '')}
                  onClick={() => toggle(p.id)}
                  disabled={!on && full}
                >
                  <Avatar
                    name={p.name}
                    type={p.types[0]}
                    avatarId={p.avatarId}
                    ownerId={activeFriendId}
                    size={40}
                  />
                  <span className="picker__item-name">{p.name}</span>
                  <span className="picker__item-num">Nv{p.battle.level}</span>
                  <span className={'picker__check' + (on ? ' is-on' : '')}>
                    {on ? i + 1 : ''}
                  </span>
                </button>
              </li>
            )
          })}
          {list.length === 0 && (
            <p className="muted-block">
              {friendPeople.loading && activeFriendId ? 'A carregar…' : 'Sem pessoas.'}
            </p>
          )}
        </ul>

        <div className="picker__foot">
          <button
            className="btn btn--primary"
            disabled={ids.length !== size}
            onClick={() => onConfirm(tab, ids)}
          >
            <Check size={16} />
            {ids.length === size
              ? 'Confirmar equipa'
              : `Faltam ${size - ids.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
