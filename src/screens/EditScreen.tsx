import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Camera, Trash2, X, Plus } from 'lucide-react'
import { usePeople, emptyDraft, type NewPerson } from '../store/people'
import { RELATIONSHIPS, getRelationship } from '../data/relationships'
import { STAT_META, type StatKey } from '../types'
import { Avatar } from '../components/Avatar'
import { RatingStars } from '../components/RatingStars'
import { usePhoto } from '../lib/usePhoto'
import { putPhoto } from '../lib/photoStore'
import { fileToDataUrl, resizeImage, uid, statColor } from '../lib/utils'

export function EditScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPerson, addPerson, updatePerson, deletePerson } = usePeople()

  const existing = id ? getPerson(id) : undefined
  const isEdit = !!existing

  const [draft, setDraft] = useState<NewPerson>(() =>
    existing
      ? {
          name: existing.name,
          nickname: existing.nickname ?? '',
          relationship: existing.relationship,
          avatarId: existing.avatarId,
          photoIds: existing.photoIds,
          rating: existing.rating,
          stats: { ...existing.stats },
          about: { ...existing.about },
          traits: [...existing.traits],
          notes: existing.notes ?? '',
          moments: existing.moments,
          favorite: existing.favorite,
        }
      : emptyDraft(),
  )

  const [previewUrl, setPreviewUrl] = useState<string | undefined>()
  const [traitInput, setTraitInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const storedAvatar = usePhoto(draft.avatarId)

  const rel = getRelationship(draft.relationship)
  const set = (patch: Partial<NewPerson>) => setDraft((d) => ({ ...d, ...patch }))
  const setAbout = (patch: Partial<NewPerson['about']>) =>
    setDraft((d) => ({ ...d, about: { ...d.about, ...patch } }))
  const setStat = (key: StatKey, value: number) =>
    setDraft((d) => ({ ...d, stats: { ...d.stats, [key]: value } }))

  const pickAvatar = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await resizeImage(await fileToDataUrl(file), 700)
    const pid = uid()
    await putPhoto(pid, dataUrl)
    setPreviewUrl(dataUrl)
    set({ avatarId: pid })
  }

  const addTrait = () => {
    const t = traitInput.trim()
    if (!t || draft.traits.includes(t)) {
      setTraitInput('')
      return
    }
    set({ traits: [...draft.traits, t] })
    setTraitInput('')
  }

  const save = () => {
    if (!draft.name.trim()) return
    const clean: NewPerson = { ...draft, name: draft.name.trim() }
    if (isEdit && existing) {
      updatePerson(existing.id, clean)
      navigate(`/person/${existing.id}`)
    } else {
      const person = addPerson(clean)
      navigate(`/person/${person.id}`, { replace: true })
    }
  }

  const remove = () => {
    if (existing) {
      deletePerson(existing.id)
      navigate('/', { replace: true })
    }
  }

  const avatarSrc = previewUrl ?? storedAvatar

  return (
    <div className="screen edit">
      <header className="edit__bar">
        <button
          className="iconbtn"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">{isEdit ? 'Editar' : 'Nova pessoa'}</h1>
        <button
          className="btn btn--primary btn--sm"
          style={{ background: rel.accent }}
          onClick={save}
          disabled={!draft.name.trim()}
        >
          Guardar
        </button>
      </header>

      <div className="edit__body">
        {/* Avatar picker */}
        <div className="edit__avatar">
          <button
            className="avatar-picker"
            onClick={() => fileRef.current?.click()}
            aria-label="Escolher foto"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="avatar-picker__img" />
            ) : (
              <Avatar
                name={draft.name || '?'}
                relationship={draft.relationship}
                size={96}
              />
            )}
            <span className="avatar-picker__badge" style={{ background: rel.accent }}>
              <Camera size={16} />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void pickAvatar(e.target.files?.[0])}
          />
        </div>

        {/* Basics */}
        <div className="field">
          <label htmlFor="name">Nome *</label>
          <input
            id="name"
            className="input"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Nome da pessoa"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="nick">Alcunha</label>
          <input
            id="nick"
            className="input"
            value={draft.nickname}
            onChange={(e) => set({ nickname: e.target.value })}
            placeholder="Como lhe chamas"
            autoComplete="off"
          />
        </div>

        {/* Relationship */}
        <div className="field">
          <label>Tipo de relação</label>
          <div className="rel-grid">
            {RELATIONSHIPS.map((r) => {
              const active = draft.relationship === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  className={'rel-chip' + (active ? ' rel-chip--active' : '')}
                  onClick={() => set({ relationship: r.key })}
                  style={
                    active
                      ? { background: r.accent, borderColor: r.accent, color: '#fff' }
                      : { borderColor: r.bg, background: r.bg, color: r.accent }
                  }
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Overall rating */}
        <div className="field">
          <label>Avaliação geral</label>
          <RatingStars
            value={draft.rating}
            size={30}
            color={rel.accent}
            onChange={(v) => set({ rating: v })}
          />
        </div>

        {/* Stats */}
        <div className="field">
          <label>Estatísticas</label>
          <div className="stat-sliders">
            {STAT_META.map((s) => (
              <div className="slider-row" key={s.key}>
                <div className="slider-row__head">
                  <span>{s.label}</span>
                  <span className="slider-row__val" style={{ color: statColor(draft.stats[s.key]) }}>
                    {draft.stats[s.key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.stats[s.key]}
                  onChange={(e) => setStat(s.key, Number(e.target.value))}
                  style={{
                    accentColor: statColor(draft.stats[s.key]),
                  }}
                  aria-label={s.label}
                />
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="field">
          <label htmlFor="met">Como se conheceram</label>
          <textarea
            id="met"
            className="input"
            rows={2}
            value={draft.about.howWeMet ?? ''}
            onChange={(e) => setAbout({ howWeMet: e.target.value })}
            placeholder="A história…"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="bday">Aniversário</label>
            <input
              id="bday"
              className="input"
              type="date"
              value={draft.about.birthday ?? ''}
              onChange={(e) => setAbout({ birthday: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="since">Desde</label>
            <input
              id="since"
              className="input"
              type="date"
              value={draft.about.since ?? ''}
              onChange={(e) => setAbout({ since: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="loc">Localização</label>
          <input
            id="loc"
            className="input"
            value={draft.about.location ?? ''}
            onChange={(e) => setAbout({ location: e.target.value })}
            placeholder="Cidade, país…"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="phone">Telemóvel</label>
          <input
            id="phone"
            className="input"
            type="tel"
            inputMode="tel"
            value={draft.about.phone ?? ''}
            onChange={(e) => setAbout({ phone: e.target.value })}
            placeholder="+351 912 345 678"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="insta">Instagram</label>
          <div className="input-prefix">
            <span className="input-prefix__at">@</span>
            <input
              id="insta"
              className="input"
              value={draft.about.instagram ?? ''}
              onChange={(e) => setAbout({ instagram: e.target.value })}
              placeholder="utilizador"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Traits */}
        <div className="field">
          <label htmlFor="trait">Características</label>
          <div className="trait-input">
            <input
              id="trait"
              className="input"
              value={traitInput}
              onChange={(e) => setTraitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTrait()
                }
              }}
              placeholder="Ex: Boa ouvinte"
              autoComplete="off"
            />
            <button
              type="button"
              className="iconbtn iconbtn--filled"
              style={{ background: rel.accent }}
              onClick={addTrait}
              aria-label="Adicionar característica"
            >
              <Plus size={20} />
            </button>
          </div>
          {draft.traits.length > 0 && (
            <div className="trait-list trait-list--edit">
              {draft.traits.map((t) => (
                <span className="trait trait--removable" key={t}>
                  {t}
                  <button
                    onClick={() =>
                      set({ traits: draft.traits.filter((x) => x !== t) })
                    }
                    aria-label={`Remover ${t}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="field">
          <label htmlFor="notes">Notas</label>
          <textarea
            id="notes"
            className="input"
            rows={3}
            value={draft.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Notas pessoais…"
          />
        </div>

        {isEdit &&
          (confirmDelete ? (
            <div className="danger-confirm">
              <p>Remover {existing?.name} da Porcadex?</p>
              <div className="danger-confirm__actions">
                <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
                <button className="btn btn--danger" onClick={remove}>
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn--danger-ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={17} /> Remover pessoa
            </button>
          ))}
      </div>
    </div>
  )
}
