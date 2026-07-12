import { getRelationship } from '../data/relationships'

interface TypeBadgeProps {
  relationship: string
  /** 'solid' for the coloured header, 'soft' for translucent on pastel cards. */
  variant?: 'solid' | 'soft' | 'light'
}

export function TypeBadge({ relationship, variant = 'soft' }: TypeBadgeProps) {
  const rel = getRelationship(relationship)

  const style: React.CSSProperties =
    variant === 'solid'
      ? { background: rel.accent, color: '#fff' }
      : variant === 'light'
        ? { background: 'rgba(255,255,255,0.28)', color: '#fff' }
        : { background: 'rgba(0,0,0,0.06)', color: rel.accent }

  return (
    <span className="type-badge" style={style}>
      {rel.label}
    </span>
  )
}
