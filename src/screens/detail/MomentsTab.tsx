import { useState } from 'react'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import type { Person, Moment } from '../../types'
import { usePeople } from '../../store/people'
import { getRelationship } from '../../data/relationships'
import { RelBadge } from '../../components/RelBadge'
import { uid, formatDate } from '../../lib/utils'

type Kind = 'beijo' | 'sexo' | 'outro'

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
  const [kind, setKind] = useState<Kind>(
    person.relationship === 'sexo' ? 'sexo' : 'beijo',
  )

  const moments = [...person.moments].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? ''),
  )

  const add = () => {
    // With a kind the badge already says Beijo/Sexo, so an empty note stays
    // empty; a plain "Outro" moment with no note falls back to a label.
    const finalTitle = title.trim() || (kind === 'outro' ? 'Momento' : '')
    const moment: Moment = {
      id: uid(),
      title: finalTitle,
      date: date || undefined,
      kind: kind === 'outro' ? undefined : kind,
    }
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

  const kindColor = (k?: string) =>
    k ? getRelationship(k).color : accent

  return (
    <div className="moments">
      {moments.length === 0 && !adding && (
        <p className="muted-block">
          Sem momentos ainda. Regista aqui cada beijo, cada vez que houve sexo,
          ou outras memórias — com a data.
        </p>
      )}

      {moments.length > 0 && (
        <ul className="timeline">
          {moments.map((m) => (
            <li className="timeline__item" key={m.id}>
              <span className="timeline__dot" style={{ background: kindColor(m.kind) }} />
              <div className="timeline__content">
                <div className="timeline__head">
                  <span className="timeline__title">
                    {m.kind && <RelBadge relationship={m.kind} />}
                    {m.title}
                  </span>
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
          <div className="segmented">
            <button
              className={'segmented__btn' + (kind === 'beijo' ? ' is-active' : '')}
              onClick={() => setKind('beijo')}
              style={kind === 'beijo' ? { background: getRelationship('beijo').color, color: '#fff' } : undefined}
            >
              Beijo
            </button>
            <button
              className={'segmented__btn' + (kind === 'sexo' ? ' is-active' : '')}
              onClick={() => setKind('sexo')}
              style={kind === 'sexo' ? { background: getRelationship('sexo').color, color: '#fff' } : undefined}
            >
              Sexo
            </button>
            <button
              className={'segmented__btn' + (kind === 'outro' ? ' is-active' : '')}
              onClick={() => setKind('outro')}
            >
              Outro
            </button>
          </div>
          <input
            className="input"
            placeholder="Nota (opcional)"
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
            <button className="btn btn--primary" style={{ background: accent }} onClick={add}>
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
