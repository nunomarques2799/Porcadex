import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Heart, Pencil, Crown, Zap, Lock } from 'lucide-react'
import { usePeople } from '../store/people'
import { typeTheme } from '../data/pokeTypes'
import { legendaryLabel } from '../data/legendary'
import { personLevelInfo, personXp } from '../data/xp'
import { STAT_META } from '../types'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { TypeBadge } from '../components/TypeBadge'
import { RelBadge } from '../components/RelBadge'
import { Ball } from '../components/Ball'
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

  const theme = typeTheme(person.types[0])
  const pLevel = personLevelInfo(personXp(person))

  return (
    <div className="detail" style={{ ['--accent' as string]: theme.accent }}>
      <div
        className={'detail__header' + (person.legendary ? ' detail__header--legendary' : '')}
        style={{ background: theme.gradient }}
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
              <Heart size={22} fill={person.favorite ? '#fff' : 'none'} stroke="#fff" />
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
            {person.nickname && <p className="detail__nick">“{person.nickname}”</p>}
            <div className="detail__badges">
              {person.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
              <RelBadge relationship={person.relationship} variant="light" />
              {person.private && (
                <span className="private-chip"><Lock size={11} /> Privada</span>
              )}
            </div>
            <div className="detail__level">
              <span className="detail__level-badge">
                <Zap size={13} /> Nível {pLevel.level}
              </span>
              <div className="detail__level-bar">
                <div
                  className="detail__level-fill"
                  style={{ width: `${pLevel.progress * 100}%`, background: theme.accent }}
                />
              </div>
              <span className="detail__level-xp">{pLevel.xp} XP</span>
            </div>
            {person.legendary && (
              <div className="legend-ribbon">
                <Crown size={14} />
                <span>Lendária</span>
                {person.legendaryCats.map((c) => (
                  <span key={c} className="legend-ribbon__cat">
                    {legendaryLabel(c)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="detail__avatar">
            <Avatar name={person.name} type={person.types[0]} avatarId={person.avatarId} size={116} ring />
            <Ball ball={person.ball} size={40} className="detail__ball" />
          </div>
        </div>
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
              style={tab === t.key ? { color: theme.accent } : undefined}
            >
              {t.label}
              {tab === t.key && (
                <span className="tabs__underline" style={{ background: theme.accent }} />
              )}
            </button>
          ))}
        </div>

        <div className="sheet__body">
          {tab === 'sobre' && <AboutTab person={person} accent={theme.accent} />}
          {tab === 'stats' && (
            <div className="stats-list">
              <div className="stats-overall">
                <span>Avaliação geral</span>
                <RatingStars value={person.rating} size={22} color={theme.accent} />
              </div>
              {STAT_META.map((s) => (
                <StatBar key={s.key} label={s.label} value={person.stats[s.key]} />
              ))}
            </div>
          )}
          {tab === 'momentos' && <MomentsTab person={person} accent={theme.accent} />}
          {tab === 'fotos' && <PhotosTab person={person} accent={theme.accent} />}
        </div>
      </div>
    </div>
  )
}
