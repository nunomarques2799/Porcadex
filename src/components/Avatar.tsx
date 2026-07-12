import { usePhoto } from '../lib/usePhoto'
import { initials } from '../lib/utils'
import { getType } from '../data/pokeTypes'

interface AvatarProps {
  name: string
  /** Primary Pokémon type key, used for the placeholder gradient. */
  type?: string
  avatarId?: string
  size?: number
  /** Render a soft ring/shadow (used on the detail header). */
  ring?: boolean
}

export function Avatar({
  name,
  type,
  avatarId,
  size = 56,
  ring = false,
}: AvatarProps) {
  const url = usePhoto(avatarId)
  const color = getType(type).color

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: url
          ? undefined
          : `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #000))`,
        boxShadow: ring ? '0 8px 24px rgba(0,0,0,0.18)' : undefined,
        border: ring ? '3px solid rgba(255,255,255,0.9)' : undefined,
      }}
      aria-hidden={!!url}
    >
      {url ? <img src={url} alt={name} /> : <span>{initials(name)}</span>}
    </div>
  )
}
