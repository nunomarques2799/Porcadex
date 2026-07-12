import { Star, StarHalf } from 'lucide-react'

interface RatingStarsProps {
  value: number // 0–5, supports .5
  size?: number
  /** When set, the stars become interactive and call back with a new value. */
  onChange?: (value: number) => void
  color?: string
}

export function RatingStars({
  value,
  size = 20,
  onChange,
  color = '#F5B23E',
}: RatingStarsProps) {
  const interactive = !!onChange

  return (
    <div
      className={'stars' + (interactive ? ' stars--interactive' : '')}
      role={interactive ? 'slider' : 'img'}
      aria-label={`Avaliação: ${value} de 5`}
      aria-valuenow={interactive ? value : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 5 : undefined}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i
        const half = !filled && value >= i - 0.5
        return (
          <button
            key={i}
            type="button"
            className="stars__star"
            disabled={!interactive}
            aria-label={`${i} estrela${i > 1 ? 's' : ''}`}
            onClick={
              interactive
                ? (e) => {
                    // Tap on the left half = .5, right half = whole star.
                    const rect = (
                      e.currentTarget as HTMLButtonElement
                    ).getBoundingClientRect()
                    const isLeft = e.clientX - rect.left < rect.width / 2
                    const next = isLeft ? i - 0.5 : i
                    onChange(next === value ? 0 : next)
                  }
                : undefined
            }
          >
            {half ? (
              <StarHalf
                size={size}
                fill={color}
                stroke={color}
                strokeWidth={1.5}
              />
            ) : (
              <Star
                size={size}
                fill={filled ? color : 'none'}
                stroke={filled ? color : '#C9CEDA'}
                strokeWidth={1.5}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
