import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Heart, Pencil } from 'lucide-react'
import { usePeople } from '../store/people'
import { getRelationship } from '../data/relationships'
import { STAT_META } from '../types'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { TypeBadge } from '../components/TypeBadge'
import { RatingStars } from '../components/RatingStars'
import { StatBar } from '../components/StatBar'
import { AboutTab } from './detail/AboutTab'
import { MomentsTab } from './detail/MomentsTab'
import { PhotosTab } from './detail/PhotosTab'

type Tab = 'sobre' | 'stats' | 'momentos' | 'fotos'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sobre', label: 'Sobre' },
  { key: 'stats', label: 'Stats' },
  { key: 'momentos', label: 'Momentos' },
  { key: 'fotos', label: 'Fotos' },
]

export function DetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getPerson, toggleFavorite } = usePeople()
  const [tab, setTab] = useState<Tab>('sobre')

  const person = getPerson(id)

  if (!person) {
    return (
      <div className="screen screen--center">
        <p>Pessoa não encontrada.</p>
        <Link to="/" className="btn btn--primary">
          Voltar
        </Link>
      </div>
    )
  }

  const rel = getRelationship(person.relationship)

  return (
    <div className="detail" style={{ ['--accent' as string]: rel.accent }}>
      <div
        className="detail__header"
        style={{
          background: `linear-gradient(150deg, ${rel.gradient[0]}, ${rel.gradient[1]})`,
        }}
      >
        <div className="detail__bar">
          <button
            className="iconbtn iconbtn--ghost"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="detail__bar-actions">
            <button
              className="iconbtn iconbtn--ghost"
              onClick={() => toggleFavorite(person.id)}
              aria-label={person.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart
                size={22}
                fill={person.favorite ? '#fff' : 'none'}
                stroke="#fff"
              />
            </button>
            <Link
              to={`/person/${person.id}/edit`}
              className="iconbtn iconbtn--ghost"
              aria-label="Editar"
            >
              <Pencil size={20} />
            </Link>
          </div>
        </div>

        <div className="detail__hero">
          <div className="detail__hero-text">
            <div className="detail__name-row">
              <h1 className="detail__name">{person.name}</h1>
              <span className="detail__number">{formatNumber(person.number)}</span>
            </div>
            {person.nickname && (
              <p className="detail__nick">“{person.nickname}”</p>
            )}
            <div className="detail__badges">
              <TypeBadge relationship={person.relationship} variant="light" />
            </div>
          </div>
          <div className="detail__avatar">
            <Avatar
              name={person.name}
              relationship={person.relationship}
              avatarId={person.avatarId}
              size={116}
              ring
            />
          </div>
        </div>

        <svg className="detail__ball-bg" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="4" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="4" />
          <circle cx="50" cy="50" r="13" fill="none" stroke="#fff" strokeWidth="4" />
        </svg>
      </div>

      <div className="sheet">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={'tabs__tab' + (tab === t.key ? ' tabs__tab--active' : '')}
              onClick={() => setTab(t.key)}
              style={tab === t.key ? { color: rel.accent } : undefined}
            >
              {t.label}
              {tab === t.key && (
                <span className="tabs__underline" style={{ background: rel.accent }} />
              )}
            </button>
          ))}
        </div>

        <div className="sheet__body">
          {tab === 'sobre' && <AboutTab person={person} accent={rel.accent} />}
          {tab === 'stats' && (
            <div className="stats-list">
              <div className="stats-overall">
                <span>Avaliação geral</span>
                <RatingStars value={person.rating} size={22} color={rel.accent} />
              </div>
              {STAT_META.map((s) => (
                <StatBar key={s.key} label={s.label} value={person.stats[s.key]} />
              ))}
            </div>
          )}
          {tab === 'momentos' && <MomentsTab person={person} accent={rel.accent} />}
          {tab === 'fotos' && <PhotosTab person={person} accent={rel.accent} />}
        </div>
      </div>
    </div>
  )
}
