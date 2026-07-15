import { NavLink } from 'react-router-dom'
import { LayoutGrid, Swords, ArrowLeftRight, Users, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useIncomingChallenges } from '../lib/battles'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  /** Só a Dex é "end": as outras não têm rotas filhas na barra. */
  end?: boolean
}

const TABS: Tab[] = [
  { to: '/', label: 'Dex', icon: LayoutGrid, end: true },
  { to: '/battle', label: 'Combate', icon: Swords },
  { to: '/compare', label: 'Comparar', icon: ArrowLeftRight },
  { to: '/friends', label: 'Amigos', icon: Users },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
]

/** Barra de separadores fixa no fundo. O contador de desafios pendentes vive
 *  no Combate porque é de lá que se desafia e se aceita. */
export function BottomNav() {
  const { challenges } = useIncomingChallenges()

  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => 'tabbar__tab' + (isActive ? ' is-active' : '')}
        >
          <span className="tabbar__icon">
            <t.icon size={21} />
            {t.to === '/battle' && challenges.length > 0 && (
              <span className="tabbar__badge">{challenges.length}</span>
            )}
          </span>
          <span className="tabbar__label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
