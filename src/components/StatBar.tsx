import { statColor } from '../lib/utils'

interface StatBarProps {
  label: string
  value: number // 0–100
}

export function StatBar({ label, value }: StatBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="statbar">
      <span className="statbar__label">{label}</span>
      <span className="statbar__value">{clamped}</span>
      <div className="statbar__track">
        <div
          className="statbar__fill"
          style={{ width: `${clamped}%`, background: statColor(clamped) }}
        />
      </div>
    </div>
  )
}
