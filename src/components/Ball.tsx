// Selectable Poké Ball designs, rendered as self-contained SVGs.

export type BallEmblem =
  | 'heart'
  | 'M'
  | 'cross'
  | 'bolt'
  | 'moon'
  | 'star'
  | 'spots'
  | 'R'

export interface BallDef {
  key: string
  label: string
  top: string
  bottom?: string
  band?: string
  emblem?: BallEmblem
  emblemColor?: string
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
  // --- Novas ---
  { key: 'quick', label: 'Quick Ball', top: '#2F8FD6', band: '#F2C21C', emblem: 'bolt', emblemColor: '#F2C21C' },
  { key: 'fast', label: 'Fast Ball', top: '#F2C21C', band: '#E23B4E', emblem: 'bolt', emblemColor: '#E23B4E' },
  { key: 'timer', label: 'Timer Ball', top: '#F4F4F4', band: '#E23B4E', emblem: 'star', emblemColor: '#E23B4E' },
  { key: 'repeat', label: 'Repeat Ball', top: '#E8823A', band: '#B23A1E' },
  { key: 'nest', label: 'Nest Ball', top: '#7DAF37' },
  { key: 'dive', label: 'Dive Ball', top: '#3FA9D6', band: '#1E6E9E' },
  { key: 'moon', label: 'Moon Ball', top: '#33356B', band: '#20223F', emblem: 'moon', emblemColor: '#F2C21C' },
  { key: 'friend', label: 'Friend Ball', top: '#79C267' },
  { key: 'lure', label: 'Lure Ball', top: '#1FA6AF', band: '#146B72' },
  { key: 'level', label: 'Level Ball', top: '#E23B4E', band: '#F2C21C' },
  { key: 'safari', label: 'Safari Ball', top: '#6E7A3A', bottom: '#C8CBB0', emblem: 'spots', emblemColor: '#3F4522' },
  { key: 'sport', label: 'Sport Ball', top: '#D98A2B', emblem: 'spots', emblemColor: '#8A5518' },
  { key: 'dream', label: 'Dream Ball', top: '#F3A6C6', band: '#D96FA0', emblem: 'moon', emblemColor: '#fff' },
  { key: 'cherish', label: 'Cherish Ball', top: '#C0392B', band: '#D9B44A', emblem: 'heart', emblemColor: '#F2C21C' },
  { key: 'beast', label: 'Beast Ball', top: '#3E4E9E', bottom: '#C9CEE8', band: '#F2C21C', emblem: 'star', emblemColor: '#F2C21C' },
  { key: 'rocket', label: 'Rocket Ball', top: '#F4F4F4', band: '#E23B4E', emblem: 'R', emblemColor: '#E23B4E' },
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
  const ec = def.emblemColor

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
          fill={ec ?? '#fff'}
        />
      )}
      {def.emblem === 'M' && (
        <text
          x="50"
          y="34"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fill={ec ?? '#F06CA0'}
          fontFamily="system-ui, sans-serif"
        >
          M
        </text>
      )}
      {def.emblem === 'cross' && (
        <g fill={ec ?? '#fff'}>
          <rect x="46" y="24" width="8" height="18" rx="2" />
          <rect x="41" y="29" width="18" height="8" rx="2" />
        </g>
      )}
      {def.emblem === 'bolt' && (
        <path
          d="M54 22 43 38h6l-4 12 12-17h-7l4-11Z"
          fill={ec ?? '#F2C21C'}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
      {def.emblem === 'moon' && (
        <path
          d="M57 24a10 10 0 1 0 1 18 8 8 0 0 1-1-18Z"
          fill={ec ?? '#F2C21C'}
        />
      )}
      {def.emblem === 'star' && (
        <path
          d="M50 23 53 31 61 31 55 36 57 44 50 39 43 44 45 36 39 31 47 31Z"
          fill={ec ?? '#fff'}
        />
      )}
      {def.emblem === 'spots' && (
        <g fill={ec ?? '#3F4522'} opacity="0.85">
          <circle cx="42" cy="30" r="5" />
          <circle cx="58" cy="27" r="4" />
          <circle cx="60" cy="38" r="3" />
          <circle cx="47" cy="39" r="3" />
        </g>
      )}
      {def.emblem === 'R' && (
        <text
          x="50"
          y="35"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fill={ec ?? '#E23B4E'}
          fontFamily="system-ui, sans-serif"
        >
          R
        </text>
      )}
    </svg>
  )
}
