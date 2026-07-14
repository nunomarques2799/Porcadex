import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Camera, Trash2, X, Plus, Crown, Lock } from 'lucide-react'
import { usePeople, emptyDraft, type NewPerson } from '../store/people'
import { RELATIONSHIPS } from '../data/relationships'
import { POKE_TYPES, typeTheme } from '../data/pokeTypes'
import { BALLS, Ball } from '../components/Ball'
import { LEGENDARY_CATS } from '../data/legendary'
import { COUNTRIES } from '../data/countries'
import { STAT_META, type StatKey, type Gender } from '../types'
import { TRAIT_SUGGESTIONS } from '../data/traits'
import { Avatar } from '../components/Avatar'
import { RelBadge } from '../components/RelBadge'
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
          gender: existing.gender,
          private: existing.private ?? false,
          relationship: existing.relationship,
          types: [...existing.types],
          country: existing.country,
          ball: existing.ball,
          legendary: existing.legendary,
          legendaryCats: [...existing.legendaryCats],
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

  const theme = typeTheme(draft.types[0])
  const set = (patch: Partial<NewPerson>) => setDraft((d) => ({ ...d, ...patch }))
  const setAbout = (patch: Partial<NewPerson['about']>) =>
    setDraft((d) => ({ ...d, about: { ...d.about, ...patch } }))
  const setStat = (key: StatKey, value: number) =>
    setDraft((d) => ({ ...d, stats: { ...d.stats, [key]: value } }))

  const toggleType = (key: string) =>
    setDraft((d) => {
      if (d.types.includes(key)) {
        return { ...d, types: d.types.filter((t) => t !== key) }
      }
      if (d.types.length < 2) return { ...d, types: [...d.types, key] }
      return { ...d, types: [d.types[0], key] } // replace secondary
    })

  const toggleCat = (key: string) =>
    setDraft((d) => ({
      ...d,
      legendaryCats: d.legendaryCats.includes(key)
        ? d.legendaryCats.filter((c) => c !== key)
        : [...d.legendaryCats, key],
    }))

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

  const addTraitValue = (t: string) => {
    if (!t || draft.traits.includes(t)) return
    set({ traits: [...draft.traits, t] })
  }

  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!draft.name.trim() || saving) return
    const clean: NewPerson = { ...draft, name: draft.name.trim() }
    setSaving(true)
    try {
      if (isEdit && existing) {
        await updatePerson(existing.id, clean)
        navigate(`/person/${existing.id}`)
      } else {
        const person = await addPerson(clean)
        navigate(`/person/${person.id}`, { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (existing) {
      await deletePerson(existing.id)
      navigate('/', { replace: true })
    }
  }

  const avatarSrc = previewUrl ?? storedAvatar

  return (
    <div className="screen edit">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">{isEdit ? 'Editar' : 'Nova pessoa'}</h1>
        <button
          className="btn btn--primary btn--sm"
          style={{ background: theme.accent }}
          onClick={() => void save()}
          disabled={!draft.name.trim() || saving}
        >
          {saving ? 'A guardar…' : 'Guardar'}
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
              <Avatar name={draft.name || '?'} type={draft.types[0]} size={96} />
            )}
            <span className="avatar-picker__badge" style={{ background: theme.accent }}>
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

        {/* Gender */}
        <div className="field">
          <label>Sexo</label>
          <div className="gender-picker">
            {(
              [
                { key: 'M', label: 'Masculino' },
                { key: 'F', label: 'Feminino' },
                { key: 'O', label: 'Outro' },
              ] as { key: Gender; label: string }[]
            ).map((g) => (
              <button
                key={g.key}
                type="button"
                className={'gender-pick' + (draft.gender === g.key ? ' is-active' : '')}
                onClick={() => set({ gender: draft.gender === g.key ? undefined : g.key })}
                style={draft.gender === g.key ? { borderColor: theme.accent, color: theme.accent } : undefined}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Private toggle */}
        <div className="field">
          <button
            type="button"
            className={'legend-toggle' + (draft.private ? ' is-active' : '')}
            onClick={() => set({ private: !draft.private })}
          >
            <span className="legend-toggle__label">
              <Lock size={18} /> Privada
            </span>
            <span className={'switch' + (draft.private ? ' switch--on' : '')}>
              <span className="switch__dot" />
            </span>
          </button>
          {draft.private && (
            <p className="dex-hint" style={{ marginTop: 8 }}>
              Só aparece na lista quando ativas “Mostrar privadas”.
            </p>
          )}
        </div>

        {/* Relationship: Beijo / Sexo */}
        <div className="field">
          <label>O que rolou</label>
          <div className="rel-picker">
            {RELATIONSHIPS.map((r) => {
              const active = draft.relationship === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  className={'rel-pick' + (active ? ' is-active' : '')}
                  onClick={() => set({ relationship: r.key })}
                  style={
                    active
                      ? {
                          borderColor: r.color,
                          background: `color-mix(in srgb, ${r.color} 12%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <RelBadge relationship={r.key} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Pokémon types */}
        <div className="field">
          <label>Tipo(s) — escolhe até 2</label>
          <div className="type-grid">
            {POKE_TYPES.map((t) => {
              const idx = draft.types.indexOf(t.key)
              const active = idx !== -1
              return (
                <button
                  key={t.key}
                  type="button"
                  className={'type-chip' + (active ? ' is-active' : '')}
                  onClick={() => toggleType(t.key)}
                  style={{
                    background: active ? t.color : 'transparent',
                    borderColor: t.color,
                    color: active ? '#fff' : t.color,
                  }}
                >
                  {t.label}
                  {idx === 0 && <span className="type-chip__primary">1º</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Country */}
        <div className="field">
          <label htmlFor="country">País</label>
          <select
            id="country"
            className="input"
            value={draft.country ?? ''}
            onChange={(e) => set({ country: e.target.value || undefined })}
          >
            <option value="">— Escolher país —</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Poké Ball */}
        <div className="field">
          <label>Pokébola</label>
          <div className="ball-grid">
            {BALLS.map((b) => (
              <button
                key={b.key}
                type="button"
                className={'ball-pick' + (draft.ball === b.key ? ' is-active' : '')}
                onClick={() => set({ ball: b.key })}
                style={draft.ball === b.key ? { borderColor: theme.accent } : undefined}
                aria-label={b.label}
                title={b.label}
              >
                <Ball ball={b.key} size={40} />
              </button>
            ))}
          </div>
        </div>

        {/* Legendary */}
        <div className="field">
          <button
            type="button"
            className={'legend-toggle' + (draft.legendary ? ' is-active' : '')}
            onClick={() => set({ legendary: !draft.legendary })}
          >
            <span className="legend-toggle__label">
              <Crown size={18} /> Lendária
            </span>
            <span className={'switch' + (draft.legendary ? ' switch--on' : '')}>
              <span className="switch__dot" />
            </span>
          </button>
          {draft.legendary && (
            <div className="cat-grid">
              {LEGENDARY_CATS.map((c) => {
                const active = draft.legendaryCats.includes(c.key)
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={'cat-chip' + (active ? ' is-active' : '')}
                    onClick={() => toggleCat(c.key)}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Overall rating */}
        <div className="field">
          <label>Avaliação geral</label>
          <RatingStars value={draft.rating} size={30} color={theme.accent} onChange={(v) => set({ rating: v })} />
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
                  style={{ accentColor: statColor(draft.stats[s.key]) }}
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
            <label htmlFor="since">Apanhado/a a</label>
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
            placeholder="Cidade…"
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
              placeholder="Ex: Olhar matador"
              autoComplete="off"
            />
            <button
              type="button"
              className="iconbtn iconbtn--filled"
              style={{ background: theme.accent }}
              onClick={addTrait}
              aria-label="Adicionar característica"
            >
              <Plus size={20} />
            </button>
          </div>
          <select
            className="input trait-suggest"
            value=""
            onChange={(e) => {
              addTraitValue(e.target.value)
              e.currentTarget.value = ''
            }}
            aria-label="Sugestões de características"
          >
            <option value="">+ Escolher das sugestões…</option>
            {TRAIT_SUGGESTIONS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((t) => (
                  <option key={t} value={t} disabled={draft.traits.includes(t)}>
                    {t}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {draft.traits.length > 0 && (
            <div className="trait-list trait-list--edit">
              {draft.traits.map((t) => (
                <span className="trait trait--removable" key={t}>
                  {t}
                  <button onClick={() => set({ traits: draft.traits.filter((x) => x !== t) })} aria-label={`Remover ${t}`}>
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
                <button className="btn btn--danger" onClick={() => void remove()}>
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
