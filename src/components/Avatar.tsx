import { usePhoto } from '../lib/usePhoto'
import { initials } from '../lib/utils'
import { getRelationship } from '../data/relationships'

interface AvatarProps {
  name: string
  relationship: string
  avatarId?: string
  size?: number
  /** Render a soft ring/shadow (used on the detail header). */
  ring?: boolean
}

export function Avatar({
  name,
  relationship,
  avatarId,
  size = 56,
  ring = false,
}: AvatarProps) {
  const url = usePhoto(avatarId)
  const rel = getRelationship(relationship)

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: url ? undefined : `linear-gradient(135deg, ${rel.gradient[0]}, ${rel.gradient[1]})`,
        boxShadow: ring ? '0 8px 24px rgba(0,0,0,0.18)' : undefined,
        border: ring ? '3px solid rgba(255,255,255,0.9)' : undefined,
      }}
      aria-hidden={!!url}
    >
      {url ? (
        <img src={url} alt={name} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  )
}
