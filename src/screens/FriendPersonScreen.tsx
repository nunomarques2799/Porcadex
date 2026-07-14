import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Crown, Zap, ArrowLeftRight, Instagram, MapPin, Calendar } from 'lucide-react'
import { useFriendPeople, useFriendProfile } from '../lib/friendPeople'
import { typeTheme } from '../data/pokeTypes'
import { legendaryLabel } from '../data/legendary'
import { personLevelInfo, publicPersonXp } from '../data/xp'
import { STAT_META } from '../types'
import { formatDate, formatNumber, instagramLink } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { TypeBadge } from '../components/TypeBadge'
import { RelBadge } from '../components/RelBadge'
import { Ball } from '../components/Ball'
import { RatingStars } from '../components/RatingStars'
import { StatBar } from '../components/StatBar'

export function FriendPersonScreen() {
  const { friendId = '', personId = '' } = useParams()
  const navigate = useNavigate()
  const { people, loading } = useFriendPeople(friendId)
  const { profile } = useFriendProfile(friendId)

  const person = useMemo(() => people.find((p) => p.id === personId), [people, personId])

  if (loading && !person) {
    return (
      <div className="screen screen--center">
        <p>A carregar…</p>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="screen screen--center">
        <p>Pessoa não encontrada.</p>
        <Link to={`/friends/${friendId}`} className="btn btn--primary">Voltar</Link>
      </div>
    )
  }

  const theme = typeTheme(person.types[0])
  const pLevel = personLevelInfo(publicPersonXp(person))

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
          <span className="detail__owner">De {profile?.name || 'amigo'}</span>
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
            <Avatar
              name={person.name}
              type={person.types[0]}
              avatarId={person.avatarId}
              ownerId={friendId}
              size={116}
              ring
            />
            <Ball ball={person.ball} size={40} className="detail__ball" />
          </div>
        </div>
      </div>

      <div className="sheet">
        <div className="sheet__body">
          <div className="stats-list">
            <div className="stats-overall">
              <span>Avaliação geral</span>
              <RatingStars value={person.rating} size={22} color={theme.accent} />
            </div>
            {STAT_META.map((s) => (
              <StatBar key={s.key} label={s.label} value={person.stats[s.key]} />
            ))}
            {person.traits.length > 0 && (
              <div className="traits-block">
                <h3>Habilidades</h3>
                <div className="traits">
                  {person.traits.map((t) => (
                    <span key={t} className="trait-chip">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(person.instagram || person.location || person.since) && (
            <div className="contact-list" style={{ marginTop: 18 }}>
              {person.since && (
                <div className="contact" style={{ ['--accent' as string]: theme.accent }}>
                  <span className="contact__icon">
                    <Calendar size={18} />
                  </span>
                  <div className="contact__text">
                    <span className="contact__label">Apanhado/a a</span>
                    <span className="contact__value">{formatDate(person.since)}</span>
                  </div>
                </div>
              )}
              {person.location && (
                <div className="contact" style={{ ['--accent' as string]: theme.accent }}>
                  <span className="contact__icon">
                    <MapPin size={18} />
                  </span>
                  <div className="contact__text">
                    <span className="contact__label">Localização</span>
                    <span className="contact__value">{person.location}</span>
                  </div>
                </div>
              )}
              {person.instagram && (
                <a
                  className="contact contact--link"
                  href={instagramLink(person.instagram).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ['--accent' as string]: theme.accent }}
                >
                  <span className="contact__icon">
                    <Instagram size={18} />
                  </span>
                  <div className="contact__text">
                    <span className="contact__label">Instagram</span>
                    <span className="contact__value">{instagramLink(person.instagram).display}</span>
                  </div>
                </a>
              )}
            </div>
          )}

          <Link
            to={`/compare?friend=${friendId}&fp=${person.id}`}
            className="btn btn--primary friend-compare-cta"
          >
            <ArrowLeftRight size={17} /> Comparar com uma tua
          </Link>
        </div>
      </div>
    </div>
  )
}
