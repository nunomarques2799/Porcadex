// Selectable Poké Ball designs, rendered as self-contained SVGs.

export interface BallDef {
  key: string
  label: string
  top: string
  bottom?: string
  band?: string
  emblem?: 'heart' | 'M' | 'cross'
}

export const BALLS: BallDef[] = [
  { key: 'poke', label: 'Poké Ball', top: '#EE1C25' },
  { key: 'great', label: 'Great Ball', top: '#2F6FB0' },
  { key: 'ultra', label: 'Ultra Ball', top: '#F2C21C', band: '#111418' },
  { key: 'master', label: 'Master Ball', top: '#6A2C86', emblem: 'M' },
  { key: 'love', label: 'Love Ball', top: '#F06CA0', emblem: 'heart' },
  { key: 'premier', label: 'Premier Ball', top: '#FBFBFB', band: '#E23B4E' },
  { key: 'dusk', label: 'Dusk Ball', top: '#1F6E4E', band: '#0E1512' },
  { key: 'net', label: 'Net Ball', top: '#2AA9A2' },
  { key: 'heal', label: 'Heal Ball', top: '#F49CC4', emblem: 'cross' },
  { key: 'luxury', label: 'Luxury Ball', top: '#20232A', bottom: '#2B2F38', band: '#D9B44A' },
]

export function getBall(key: string | undefined): BallDef {
  return BALLS.find((b) => b.key === key) ?? BALLS[0]
}

interface BallProps {
  ball: string
  size?: number
  className?: string
}

export function Ball({ ball, size = 40, className }: BallProps) {
  const def = getBall(ball)
  const band = def.band ?? '#22252C'
  const bottom = def.bottom ?? '#F3F4F6'
  const stroke = '#1A1C22'

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {/* bottom half */}
      <circle cx="50" cy="50" r="45" fill={bottom} stroke={stroke} strokeWidth="4" />
      {/* top half */}
      <path
        d="M5 50a45 45 0 0 1 90 0Z"
        fill={def.top}
        stroke={stroke}
        strokeWidth="4"
      />
      {/* band */}
      <rect x="5" y="45" width="90" height="10" fill={band} />
      <line x1="5" y1="45" x2="95" y2="45" stroke={stroke} strokeWidth="2" />
      <line x1="5" y1="55" x2="95" y2="55" stroke={stroke} strokeWidth="2" />
      {/* centre button */}
      <circle cx="50" cy="50" r="15" fill={band} stroke={stroke} strokeWidth="3" />
      <circle cx="50" cy="50" r="8" fill="#fff" stroke={stroke} strokeWidth="2.5" />

      {def.emblem === 'heart' && (
        <path
          d="M50 33c-2-4-9-4-9 1 0 3 4 6 9 9 5-3 9-6 9-9 0-5-7-5-9-1Z"
          fill="#fff"
        />
      )}
      {def.emblem === 'M' && (
        <text
          x="50"
          y="34"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fill="#F06CA0"
          fontFamily="system-ui, sans-serif"
        >
          M
        </text>
      )}
      {def.emblem === 'cross' && (
        <g fill="#fff">
          <rect x="46" y="24" width="8" height="18" rx="2" />
          <rect x="41" y="29" width="18" height="8" rx="2" />
        </g>
      )}
    </svg>
  )
}
