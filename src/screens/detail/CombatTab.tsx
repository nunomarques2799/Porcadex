import { Swords, Plus, Zap, Trophy } from 'lucide-react'
import type { Person } from '../../types'
import { getType } from '../../data/pokeTypes'
import {
  personBattleStats,
  personMoves,
  battleStatTotal,
  battleLevelInfo,
  allocatePoint,
  STAT_POINT_VALUE,
  MOVE_CATEGORY_META,
  type BattleStatKey,
} from '../../data/battle'
import { statColor } from '../../lib/utils'
import { usePeople } from '../../store/people'

// Escala das barras de stats de batalha (o teto visual, não o máximo real).
const STAT_SCALE = 200

export function CombatTab({ person, accent }: { person: Person; accent: string }) {
  const { updatePerson } = usePeople()
  const stats = personBattleStats(person)
  const total = battleStatTotal(stats)
  const moves = personMoves(person)
  const lvl = battleLevelInfo(person.battle.xp)
  const points = person.battle.points

  const spend = (key: BattleStatKey) => {
    if (person.battle.points <= 0) return
    void updatePerson(person.id, { battle: allocatePoint(person.battle, key) })
  }

  return (
    <div className="combat">
      {/* Nível de combate */}
      <section className="combat__section">
        <div className="combat__head">
          <span className="detail__level-badge" style={{ background: accent }}>
            <Zap size={13} /> Nível {person.battle.level}
          </span>
          <span className="combat__total">
            {person.battle.wins}V · {person.battle.losses}D
          </span>
        </div>
        <div className="combat__xpbar">
          <div
            className="combat__xpfill"
            style={{ width: `${lvl.progress * 100}%`, background: accent }}
          />
        </div>
        <span className="combat__xptext">
          {lvl.into}/{lvl.span} XP para o nível {person.battle.level + 1}
        </span>
      </section>

      <section className="combat__section">
        <div className="combat__head">
          <h3 className="about__heading">Stats de combate</h3>
          <span className="combat__total">
            Total <strong>{total}</strong>
          </span>
        </div>
        {points > 0 && (
          <div className="combat__points" style={{ ['--accent' as string]: accent }}>
            <Trophy size={15} /> {points} {points === 1 ? 'ponto' : 'pontos'} para distribuir
            (+{STAT_POINT_VALUE} cada)
          </div>
        )}
        <div className="battle-stats">
          {stats.map((s) => {
            const pct = Math.min(100, (s.value / STAT_SCALE) * 100)
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
                {points > 0 && (
                  <button
                    className="battle-stat__plus"
                    style={{ background: accent }}
                    onClick={() => spend(s.key)}
                    aria-label={`Aumentar ${s.label}`}
                  >
                    <Plus size={14} />
                  </button>
                )}
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
                  <span className="move-card__type" style={{ background: t.color }}>
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
          Ganha XP a vencer batalhas contra pessoas de amigos. A cada nível
          reforças um stat à tua escolha.
        </p>
      </section>
    </div>
  )
}
