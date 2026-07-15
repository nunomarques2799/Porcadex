// Peças visuais partilhadas pelo combate vs CPU e pelo combate ao vivo (PvP).

import { getType } from '../data/pokeTypes'
import { moveMaxPp, type Fighter, type TeamState } from '../data/battle'
import { TypeBadge } from './TypeBadge'
import { Avatar } from './Avatar'

export function hpColor(pct: number): string {
  if (pct > 0.5) return '#58d860'
  if (pct > 0.2) return '#f8d030'
  return '#f85038'
}

/** As bolinhas que mostram quantos da equipa ainda estão de pé. */
export function TeamDots({ team }: { team: TeamState }) {
  if (team.fighters.length < 2) return null
  return (
    <div className="team-dots" aria-label={`${team.fighters.filter((f) => f.hp > 0).length} de ${team.fighters.length} de pé`}>
      {team.fighters.map((f, i) => (
        <span
          key={f.id + i}
          className={
            'team-dot' +
            (f.hp <= 0 ? ' is-out' : '') +
            (i === team.active ? ' is-active' : '')
          }
        />
      ))}
    </div>
  )
}

/** A caixa de nome/nível/tipos/HP, ao estilo Pokémon. */
export function InfoBox({
  className,
  f,
  team,
  showNumbers,
}: {
  className?: string
  f: Fighter
  team: TeamState
  showNumbers?: boolean
}) {
  const pct = f.maxHp > 0 ? Math.max(0, Math.min(1, f.hp / f.maxHp)) : 0
  return (
    <div className={'info-box' + (className ? ' ' + className : '')}>
      <div className="info-box__top">
        <span className="info-box__name">{f.name.split(' ')[0]}</span>
        <span className="info-box__lv">Nv{f.level}</span>
      </div>
      <div className="info-box__types">
        {f.types.map((t) => (
          <TypeBadge key={t} type={t} size="xs" />
        ))}
      </div>
      <div className="info-box__hprow">
        <span className="info-box__hplabel">HP</span>
        <div className="info-box__hptrack">
          <div
            className="info-box__hpfill"
            style={{ width: `${pct * 100}%`, background: hpColor(pct) }}
          />
        </div>
      </div>
      {showNumbers && (
        <div className="info-box__num">
          {Math.max(0, f.hp)}/{f.maxHp}
        </div>
      )}
      <TeamDots team={team} />
    </div>
  )
}

/** Grelha dos 4 ataques. `pp` é opcional — o PvP não gasta PP. */
export function MoveMenu({
  f,
  pp,
  hover,
  onHover,
  onPick,
}: {
  f: Fighter
  pp?: number[]
  hover: number
  onHover: (i: number) => void
  onPick: (i: number) => void
}) {
  const allOut = pp ? pp.every((v) => v <= 0) : false
  const previewMove = f.moves[hover] ?? f.moves[0]
  const pt = getType(previewMove?.type)

  return (
    <div className="move-menu">
      <div className="move-menu__moves">
        {f.moves.map((m, i) => {
          const out = pp ? pp[i] <= 0 && !allOut : false
          const mt = getType(m.type)
          return (
            <button
              key={m.name + i}
              className={'move-cell' + (hover === i ? ' is-hover' : '')}
              style={{ ['--mv' as string]: mt.color }}
              disabled={out}
              onMouseEnter={() => onHover(i)}
              onFocus={() => onHover(i)}
              onClick={() => onPick(i)}
            >
              <span className="move-cell__dot" style={{ background: mt.color }} />
              <span className="move-cell__name">{m.name}</span>
            </button>
          )
        })}
      </div>
      <div className="move-menu__side">
        {pp && (
          <div className="move-menu__pp">
            PP <b>{pp[hover] ?? 0}/{moveMaxPp(f.moves[hover] ?? f.moves[0])}</b>
          </div>
        )}
        <div className="move-menu__type" style={{ color: pt.color }}>
          {pt.label.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

/** Banco de suplentes — quem pode entrar em campo. */
export function SwitchMenu({
  team,
  options,
  forced,
  onPick,
  onCancel,
}: {
  team: TeamState
  options: number[]
  /** Sem lutador de pé em campo não há como recusar a troca. */
  forced?: boolean
  onPick: (i: number) => void
  onCancel?: () => void
}) {
  return (
    <div className="switch-menu">
      <div className="switch-menu__head">
        <span>{forced ? 'Quem entra?' : 'Trocar de lutador'}</span>
        {!forced && onCancel && (
          <button className="switch-menu__back" onClick={onCancel}>
            Voltar
          </button>
        )}
      </div>
      <div className="switch-menu__list">
        {options.map((i) => {
          const f = team.fighters[i]
          const pct = f.maxHp > 0 ? f.hp / f.maxHp : 0
          return (
            <button key={f.id + i} className="switch-cell" onClick={() => onPick(i)}>
              <Avatar name={f.name} type={f.types[0]} size={34} />
              <span className="switch-cell__text">
                <span className="switch-cell__name">{f.name.split(' ')[0]}</span>
                <span className="switch-cell__hp">
                  <span className="switch-cell__track">
                    <span
                      className="switch-cell__fill"
                      style={{ width: `${pct * 100}%`, background: hpColor(pct) }}
                    />
                  </span>
                  {f.hp}/{f.maxHp}
                </span>
              </span>
              <span className="switch-cell__lv">Nv{f.level}</span>
            </button>
          )
        })}
        {options.length === 0 && <p className="muted-block">Não há mais ninguém de pé.</p>}
      </div>
    </div>
  )
}
