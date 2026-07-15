import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Heart, X, Sun, Moon, BarChart3, Crown, ArrowLeftRight, User, Users, Lock, Swords, Bell } from 'lucide-react'
import { usePeople } from '../store/people'
import { useIncomingChallenges } from '../lib/battles'
import { useTheme } from '../lib/theme'
import { useHomeCountry } from '../lib/settings'
import { countryName } from '../data/countries'
import { totalXp, levelInfo } from '../data/xp'
import { PersonCard } from '../components/PersonCard'

type Dex = 'todos' | 'nacional' | 'internacional'
type Quick = 'todos' | 'fav' | 'beijo' | 'sexo' | 'lendaria' | 'privadas'

export function ListScreen() {
  const { people } = usePeople()
  const { theme, toggle } = useTheme()
  const [home] = useHomeCountry()
  const { challenges } = useIncomingChallenges()
  const level = levelInfo(totalXp(people, home)).level
  const [query, setQuery] = useState('')
  const [dex, setDex] = useState<Dex>('todos')
  const [quick, setQuick] = useState<Quick>('todos')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => {
        // Privates only show when the "Privadas" chip is active.
        if (quick !== 'privadas' && p.private) return false
        if (dex === 'nacional' && p.country !== home) return false
        if (dex === 'internacional' && (!p.country || p.country === home)) return false
        if (quick === 'fav' && !p.favorite) return false
        if (quick === 'beijo' && p.relationship !== 'beijo') return false
        if (quick === 'sexo' && p.relationship !== 'sexo') return false
        if (quick === 'lendaria' && !p.legendary) return false
        if (quick === 'privadas' && !p.private) return false
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nickname ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.number - b.number)
  }, [people, query, dex, quick, home])

  return (
    <div className="screen">
      <header className="list-header">
        <div className="list-header__top">
          <div>
            <h1 className="list-header__title">
              <span className="logo-ball" aria-hidden="true" />
              Porcadex
            </h1>
            <p className="list-header__subtitle">
              <span className="level-chip">Nível {level}</span>
              {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>
          <div className="list-header__actions">
            <Link to="/me" className="theme-toggle" aria-label="Meu perfil">
              <User size={20} />
            </Link>
            <Link to="/friends" className="theme-toggle" aria-label="Amigos">
              <Users size={20} />
            </Link>
            <Link to="/compare" className="theme-toggle" aria-label="Comparar">
              <ArrowLeftRight size={20} />
            </Link>
            <Link to="/battle" className="theme-toggle" aria-label="Combate">
              <Swords size={20} />
            </Link>
            <Link to="/challenges" className="theme-toggle theme-toggle--badge" aria-label="Desafios">
              <Bell size={20} />
              {challenges.length > 0 && <span className="notif-badge">{challenges.length}</span>}
            </Link>
            <Link to="/stats" className="theme-toggle" aria-label="Estatísticas">
              <BarChart3 size={20} />
            </Link>
            <button
              className="theme-toggle"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div className="searchbar">
          <Search size={18} />
          <input
            type="search"
            inputMode="search"
            placeholder="Procurar pessoa…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Procurar pessoa"
          />
          {query && (
            <button className="searchbar__clear" onClick={() => setQuery('')} aria-label="Limpar pesquisa">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dex selector */}
        <div className="segmented segmented--dex">
          <button className={'segmented__btn' + (dex === 'todos' ? ' is-active' : '')} onClick={() => setDex('todos')}>
            Todos
          </button>
          <button className={'segmented__btn' + (dex === 'nacional' ? ' is-active' : '')} onClick={() => setDex('nacional')}>
            Nacional
          </button>
          <button
            className={'segmented__btn' + (dex === 'internacional' ? ' is-active' : '')}
            onClick={() => setDex('internacional')}
          >
            Internacional
          </button>
        </div>
        {dex === 'nacional' && (
          <p className="dex-hint">A mostrar pessoas de {countryName(home) || 'o teu país'}.</p>
        )}

        <div className="chips" role="tablist" aria-label="Filtros">
          <Chip active={quick === 'todos'} onClick={() => setQuick('todos')}>
            Todos
          </Chip>
          <Chip active={quick === 'fav'} onClick={() => setQuick('fav')} color="#E84C82">
            <Heart size={13} fill={quick === 'fav' ? '#fff' : '#E84C82'} stroke="none" />
            Favoritos
          </Chip>
          <Chip active={quick === 'beijo'} onClick={() => setQuick('beijo')} color="#EC5A96">
            Beijo
          </Chip>
          <Chip active={quick === 'sexo'} onClick={() => setQuick('sexo')} color="#E23B4E">
            Sexo
          </Chip>
          <Chip active={quick === 'lendaria'} onClick={() => setQuick('lendaria')} color="#E0A62A">
            <Crown size={13} fill={quick === 'lendaria' ? '#fff' : '#E0A62A'} stroke="none" />
            Lendárias
          </Chip>
          <Chip active={quick === 'privadas'} onClick={() => setQuick('privadas')} color="#5b6072">
            <Lock size={12} />
            Privadas
          </Chip>
        </div>
      </header>

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <EmptyState hasPeople={people.length > 0} />
      )}

      <Link to="/add" className="fab" aria-label="Adicionar pessoa">
        <Plus size={26} strokeWidth={2.5} />
      </Link>
    </div>
  )
}

function Chip({
  active,
  onClick,
  color = '#4E86EB',
  children,
}: {
  active: boolean
  onClick: () => void
  color?: string
  children: React.ReactNode
}) {
  return (
    <button
      className={'chip' + (active ? ' chip--active' : '')}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      style={active ? { background: color, borderColor: color } : undefined}
    >
      {children}
    </button>
  )
}

function EmptyState({ hasPeople }: { hasPeople: boolean }) {
  return (
    <div className="empty">
      <div className="empty__ball" style={{ background: 'linear-gradient(135deg, #5C90F0, #EC5A96)' }}>
        <span className="logo-ball logo-ball--lg" />
      </div>
      <h2>{hasPeople ? 'Nada por aqui' : 'A tua Porcadex está vazia'}</h2>
      <p>
        {hasPeople
          ? 'Ninguém corresponde a este filtro.'
          : 'Adiciona a primeira pessoa e começa a tua coleção.'}
      </p>
      {!hasPeople && (
        <Link to="/add" className="btn btn--primary">
          <Plus size={18} /> Adicionar pessoa
        </Link>
      )}
    </div>
  )
}
