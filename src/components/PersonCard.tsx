import { Link } from 'react-router-dom'
import { Heart, Crown } from 'lucide-react'
import type { Person } from '../types'
import { typeTheme } from '../data/pokeTypes'
import { countryName } from '../data/countries'
import { formatNumber } from '../lib/utils'
import { Avatar } from './Avatar'
import { TypeBadge } from './TypeBadge'
import { RelBadge } from './RelBadge'
import { Ball } from './Ball'

export function PersonCard({ person }: { person: Person }) {
  const theme = typeTheme(person.types[0])
  const country = countryName(person.country)

  return (
    <Link
      to={`/person/${person.id}`}
      className={'card' + (person.legendary ? ' card--legendary' : '')}
      style={{ background: theme.bg }}
    >
      <div className="card__top">
        <span className="card__number">{formatNumber(person.number)}</span>
        {person.legendary && (
          <span className="card__legend" title="Lendária">
            <Crown size={13} />
          </span>
        )}
        <Ball ball={person.ball} size={26} className="card__ball-icon" />
      </div>

      <div className="card__body">
        <h3 className="card__name">{person.name}</h3>
        <div className="card__badges">
          {person.types.map((t) => (
            <TypeBadge key={t} type={t} size="sm" />
          ))}
        </div>
        <div className="card__rel">
          <RelBadge relationship={person.relationship} />
          {country && <span className="card__country">{country}</span>}
        </div>
      </div>

      <div className="card__avatar" style={{ ['--glow' as string]: theme.accent }}>
        {person.favorite && (
          <span className="card__fav" style={{ background: theme.accent }}>
            <Heart size={11} fill="#fff" stroke="none" />
          </span>
        )}
        <Avatar
          name={person.name}
          type={person.types[0]}
          avatarId={person.avatarId}
          size={58}
        />
      </div>
    </Link>
  )
}
