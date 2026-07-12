import { Flame } from 'lucide-react'
import { getRelationship } from '../data/relationships'

/** Small SVG kiss/lips mark (lucide has no lips icon). */
function KissIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 9c-1.2-2-3.6-2.4-5.2-1.2C5 9 5 11.2 6.6 13l5.4 5 5.4-5c1.6-1.8 1.6-4-.2-5.2C15.6 6.6 13.2 7 12 9Z"
        fill="currentColor"
      />
    </svg>
  )
}

interface RelBadgeProps {
  relationship: string
  variant?: 'solid' | 'light'
}

/** Beijo / Sexo badge. */
export function RelBadge({ relationship, variant = 'solid' }: RelBadgeProps) {
  const r = getRelationship(relationship)
  const style =
    variant === 'light'
      ? { background: 'rgba(255,255,255,0.24)', color: '#fff' }
      : { background: r.color, color: '#fff' }
  return (
    <span className="rel-badge" style={style}>
      {r.icon === 'kiss' ? <KissIcon /> : <Flame size={13} />}
      {r.label}
    </span>
  )
}
