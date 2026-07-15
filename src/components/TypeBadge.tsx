import { getType } from '../data/pokeTypes'

interface TypeBadgeProps {
  type: string
  size?: 'xs' | 'sm' | 'md'
}

/** A Pokémon-type pill, coloured by the type. */
export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const t = getType(type)
  return (
    <span
      className={'type-badge type-badge--' + size}
      style={{ background: t.color }}
    >
      {t.label}
    </span>
  )
}
