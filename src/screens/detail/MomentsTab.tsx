import { useState } from 'react'
import { Plus, Trash2, CalendarDays, ShieldAlert, Beer, Coffee, Egg } from 'lucide-react'
import type { Person, Moment, MomentCondition } from '../../types'
import { usePeople } from '../../store/people'
import { useUserProfile } from '../../lib/userProfile'
import { getRelationship } from '../../data/relationships'
import { momentIsFertile, XP } from '../../data/xp'
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
  const [profile] = useUserProfile()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [kind, setKind] = useState<Kind>(
    person.relationship === 'sexo' ? 'sexo' : 'beijo',
  )
  const [condition, setCondition] = useState<MomentCondition | undefined>()
  const [userCheated, setUserCheated] = useState(false)
  const [personCheated, setPersonCheated] = useState(false)

  const moments = [...person.moments].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? ''),
  )

  // Pré-visualização do bónus enquanto se escolhe a data.
  const draftFertile = momentIsFertile(
    { id: '', title: '', kind: kind === 'outro' ? undefined : kind, date },
    profile,
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
      condition,
      userCheated: userCheated || undefined,
      personCheated: personCheated || undefined,
    }
    updatePerson(person.id, { moments: [...person.moments, moment] })
    setTitle('')
    setDate('')
    setCondition(undefined)
    setUserCheated(false)
    setPersonCheated(false)
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
                {(m.userCheated || m.personCheated || m.condition || momentIsFertile(m, profile)) && (
                  <div className="timeline__flags">
                    {momentIsFertile(m, profile) && (
                      <span className="cheat-flag cheat-flag--fertile">
                        <Egg size={12} /> Período fértil · +{XP.momentFertil} XP
                      </span>
                    )}
                    {m.condition === 'bebado' && (
                      <span className="cheat-flag cheat-flag--drunk">
                        <Beer size={12} /> Bêbado/a
                      </span>
                    )}
                    {m.condition === 'sobrio' && (
                      <span className="cheat-flag cheat-flag--sober">
                        <Coffee size={12} /> Sóbrio/a
                      </span>
                    )}
                    {m.userCheated && (
                      <span className="cheat-flag cheat-flag--user">
                        <ShieldAlert size={12} /> Eu traí
                      </span>
                    )}
                    {m.personCheated && (
                      <span className="cheat-flag cheat-flag--them">
                        <ShieldAlert size={12} /> Traição dela/e
                      </span>
                    )}
                  </div>
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
          <div className="field">
            <label htmlFor="moment-date">Data (opcional)</label>
            <input
              id="moment-date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {draftFertile && (
            <p className="moment-form__fertile">
              <Egg size={14} /> Esta data cai na tua janela fértil — bónus de{' '}
              <b>+{XP.momentFertil} XP</b>.
            </p>
          )}

          <div className="field">
            <label>Como estavas</label>
            <div className="segmented">
              <button
                className={'segmented__btn' + (condition === 'bebado' ? ' is-active' : '')}
                onClick={() => setCondition(condition === 'bebado' ? undefined : 'bebado')}
                style={condition === 'bebado' ? { background: '#E0A62A', color: '#fff' } : undefined}
              >
                <Beer size={14} /> Bêbado/a
              </button>
              <button
                className={'segmented__btn' + (condition === 'sobrio' ? ' is-active' : '')}
                onClick={() => setCondition(condition === 'sobrio' ? undefined : 'sobrio')}
                style={condition === 'sobrio' ? { background: '#2FAE82', color: '#fff' } : undefined}
              >
                <Coffee size={14} /> Sóbrio/a
              </button>
            </div>
          </div>

          <div className="cheat-toggles">
            <label className="cheat-toggle">
              <input
                type="checkbox"
                checked={userCheated}
                onChange={(e) => setUserCheated(e.target.checked)}
              />
              <span>Eu traí o meu parceiro</span>
            </label>
            <label className="cheat-toggle">
              <input
                type="checkbox"
                checked={personCheated}
                onChange={(e) => setPersonCheated(e.target.checked)}
              />
              <span>Traição da/o parceira/o dela</span>
            </label>
          </div>
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
