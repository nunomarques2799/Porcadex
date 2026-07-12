import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Person } from '../types'
import { getRelationship } from '../data/relationships'
import { formatNumber } from '../lib/utils'
import { Avatar } from './Avatar'
import { TypeBadge } from './TypeBadge'
import { RatingStars } from './RatingStars'

export function PersonCard({ person }: { person: Person }) {
  const rel = getRelationship(person.relationship)

  return (
    <Link
      to={`/person/${person.id}`}
      className="card"
      style={{ background: rel.bg }}
    >
      <span className="card__number">{formatNumber(person.number)}</span>
      {person.favorite && (
        <Heart className="card__fav" size={15} fill={rel.accent} stroke="none" />
      )}

      <div className="card__body">
        <h3 className="card__name">{person.name}</h3>
        <div className="card__badges">
          <TypeBadge relationship={person.relationship} variant="soft" />
        </div>
        <div className="card__rating">
          <RatingStars value={person.rating} size={13} color={rel.accent} />
        </div>
      </div>

      <div className="card__avatar">
        <Avatar
          name={person.name}
          relationship={person.relationship}
          avatarId={person.avatarId}
          size={62}
        />
      </div>

      {/* Decorative pokéball watermark */}
      <svg className="card__ball" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke={rel.accent} strokeWidth="6" />
        <line x1="4" y1="50" x2="96" y2="50" stroke={rel.accent} strokeWidth="6" />
        <circle cx="50" cy="50" r="14" fill={rel.bg} stroke={rel.accent} strokeWidth="6" />
      </svg>
    </Link>
  )
}
