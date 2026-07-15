import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { usePeople } from '../store/people'
import type { Person } from '../types'
import { Avatar } from './Avatar'

/** Modal para escolher uma das MINHAS pessoas (para desafiar/aceitar). */
export function MyPersonPicker({
  title = 'Escolher a tua pessoa',
  onClose,
  onSelect,
}: {
  title?: string
  onClose: () => void
  onSelect: (person: Person) => void
}) {
  const { people } = usePeople()
  const [q, setQ] = useState('')
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))

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
                <span className="picker__item-num">Nv{p.battle.level}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <p className="muted-block">Sem pessoas.</p>}
        </ul>
      </div>
    </div>
  )
}
