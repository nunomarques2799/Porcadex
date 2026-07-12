import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Heart, X, Sun, Moon } from 'lucide-react'
import { usePeople } from '../store/people'
import { useTheme } from '../lib/theme'
import { RELATIONSHIPS, getRelationship } from '../data/relationships'
import { PersonCard } from '../components/PersonCard'

export function ListScreen() {
  const { people } = usePeople()
  const { theme, toggle } = useTheme()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all') // 'all' | 'fav' | rel key

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => {
        if (filter === 'fav' && !p.favorite) return false
        if (filter !== 'all' && filter !== 'fav' && p.relationship !== filter)
          return false
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nickname ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.number - b.number)
  }, [people, query, filter])

  // Only show type chips for relationship types actually in use.
  const usedTypes = useMemo(() => {
    const set = new Set(people.map((p) => p.relationship))
    return RELATIONSHIPS.filter((r) => set.has(r.key))
  }, [people])

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
              {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'} na tua coleção
            </p>
          </div>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
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
            <button
              className="searchbar__clear"
              onClick={() => setQuery('')}
              aria-label="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="chips" role="tablist" aria-label="Filtros">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todos
          </Chip>
          <Chip
            active={filter === 'fav'}
            onClick={() => setFilter('fav')}
            color="#E84C82"
          >
            <Heart size={13} fill={filter === 'fav' ? '#fff' : '#E84C82'} stroke="none" />
            Favoritos
          </Chip>
          {usedTypes.map((r) => (
            <Chip
              key={r.key}
              active={filter === r.key}
              onClick={() => setFilter(r.key)}
              color={r.accent}
            >
              {r.label}
            </Chip>
          ))}
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
  const rel = getRelationship('amigo')
  return (
    <div className="empty">
      <div
        className="empty__ball"
        style={{ background: `linear-gradient(135deg, ${rel.gradient[0]}, ${rel.gradient[1]})` }}
      >
        <span className="logo-ball logo-ball--lg" />
      </div>
      <h2>{hasPeople ? 'Nada por aqui' : 'A tua Porcadex está vazia'}</h2>
      <p>
        {hasPeople
          ? 'Nenhuma pessoa corresponde a esta pesquisa.'
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
