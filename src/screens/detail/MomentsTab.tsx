import { useState } from 'react'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import type { Person, Moment } from '../../types'
import { usePeople } from '../../store/people'
import { uid, formatDate } from '../../lib/utils'

export function MomentsTab({
  person,
  accent,
}: {
  person: Person
  accent: string
}) {
  const { updatePerson } = usePeople()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')

  const moments = [...person.moments].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? ''),
  )

  const add = () => {
    if (!title.trim()) return
    const moment: Moment = { id: uid(), title: title.trim(), date: date || undefined }
    updatePerson(person.id, { moments: [...person.moments, moment] })
    setTitle('')
    setDate('')
    setAdding(false)
  }

  const remove = (mid: string) => {
    updatePerson(person.id, {
      moments: person.moments.filter((m) => m.id !== mid),
    })
  }

  return (
    <div className="moments">
      {moments.length === 0 && !adding && (
        <p className="muted-block">
          Sem momentos ainda. Regista aqui as memórias que partilham.
        </p>
      )}

      {moments.length > 0 && (
        <ul className="timeline">
          {moments.map((m) => (
            <li className="timeline__item" key={m.id}>
              <span className="timeline__dot" style={{ background: accent }} />
              <div className="timeline__content">
                <div className="timeline__head">
                  <span className="timeline__title">{m.title}</span>
                  <button
                    className="timeline__del"
                    onClick={() => remove(m.id)}
                    aria-label="Remover momento"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {m.date && (
                  <span className="timeline__date">
                    <CalendarDays size={13} /> {formatDate(m.date)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="moment-form">
          <input
            className="input"
            placeholder="O que aconteceu?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="moment-form__actions">
            <button className="btn btn--ghost" onClick={() => setAdding(false)}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              style={{ background: accent }}
              onClick={add}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="add-row"
          onClick={() => setAdding(true)}
          style={{ color: accent, borderColor: accent }}
        >
          <Plus size={18} /> Adicionar momento
        </button>
      )}
    </div>
  )
}
