import { Swords } from 'lucide-react'
import type { Person } from '../../types'
import { getType } from '../../data/pokeTypes'
import {
  personBattleStats,
  personMoves,
  battleStatTotal,
  MOVE_CATEGORY_META,
} from '../../data/battle'
import { statColor } from '../../lib/utils'

// Escala das barras de stats de batalha (o teto visual, não o máximo real).
const STAT_SCALE = 180

export function CombatTab({ person, accent }: { person: Person; accent: string }) {
  const stats = personBattleStats(person)
  const total = battleStatTotal(stats)
  const moves = personMoves(person)

  return (
    <div className="combat">
      <section className="combat__section">
        <div className="combat__head">
          <h3 className="about__heading">Stats de combate</h3>
          <span className="combat__total">
            Total <strong>{total}</strong>
          </span>
        </div>
        <div className="battle-stats">
          {stats.map((s) => {
            const pct = Math.min(100, (s.value / STAT_SCALE) * 100)
            // Cor pela força relativa (stats vão até ~170).
            const color = statColor((s.value / STAT_SCALE) * 100)
            return (
              <div className="battle-stat" key={s.key}>
                <span className="battle-stat__label">{s.label}</span>
                <span className="battle-stat__value">{s.value}</span>
                <div className="battle-stat__track">
                  <div
                    className="battle-stat__fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="combat__section">
        <h3 className="about__heading">
          <Swords size={16} /> Ataques
        </h3>
        <div className="move-grid">
          {moves.map((m) => {
            const t = getType(m.type)
            const cat = MOVE_CATEGORY_META[m.category]
            return (
              <div
                className="move-card"
                key={m.name}
                style={{ ['--move-type' as string]: t.color }}
              >
                <div className="move-card__top">
                  <span className="move-card__name">{m.name}</span>
                  {m.power > 0 ? (
                    <span className="move-card__power">{m.power}</span>
                  ) : (
                    <span className="move-card__power move-card__power--status">—</span>
                  )}
                </div>
                <div className="move-card__tags">
                  <span
                    className="move-card__type"
                    style={{ background: t.color }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="move-card__cat"
                    style={{ color: cat.color, borderColor: cat.color }}
                  >
                    {cat.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="combat__hint" style={{ ['--accent' as string]: accent }}>
          Os ataques nascem do(s) tipo(s) e das características da pessoa.
          Muda-os editando o perfil.
        </p>
      </section>
    </div>
  )
}
