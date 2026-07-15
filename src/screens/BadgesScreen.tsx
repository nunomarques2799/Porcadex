import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, Lock } from 'lucide-react'
import { usePeople } from '../store/people'
import { useHomeCountry } from '../lib/settings'
import { useUserProfile } from '../lib/userProfile'
import { badgeStates } from '../data/badges'

export function BadgesScreen() {
  const { people } = usePeople()
  const [home] = useHomeCountry()
  const [profile] = useUserProfile()
  const navigate = useNavigate()

  const states = useMemo(
    () => badgeStates({ people, home, cycle: profile }),
    [people, home, profile],
  )
  const earned = states.filter((s) => s.earned).length

  return (
    <div className="screen badges">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">Badges</h1>
        <span style={{ width: 42 }} />
      </header>

      <p className="badges__summary">
        <b>{earned}</b> de {states.length} desbloqueados
      </p>

      <div className="badge-grid">
        {states.map(({ def, value, earned, progress }) => {
          const Icon = def.icon
          return (
            <div
              key={def.id}
              className={'badge-card' + (earned ? ' badge-card--earned' : '')}
            >
              <div
                className="badge-card__icon"
                style={earned ? { background: def.color } : undefined}
              >
                <Icon size={22} />
                <span className="badge-card__status">
                  {earned ? <Check size={12} /> : <Lock size={11} />}
                </span>
              </div>
              <h3 className="badge-card__title">{def.title}</h3>
              <p className="badge-card__desc">{def.desc}</p>
              <div className="badge-card__bar">
                <div
                  className="badge-card__fill"
                  style={{
                    width: `${progress * 100}%`,
                    background: earned ? def.color : 'var(--muted)',
                  }}
                />
              </div>
              <span className="badge-card__count">
                {value}/{def.target}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
