import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Heart, Flame, Crown, Globe, Star, Zap, Award, ChevronRight, Maximize2 } from 'lucide-react'
import { usePeople } from '../store/people'
import { useHomeCountry } from '../lib/settings'
import { COUNTRIES, countryName } from '../data/countries'
import { POKE_TYPES, getType } from '../data/pokeTypes'
import { LEGENDARY_CATS } from '../data/legendary'
import { totalXp, levelInfo } from '../data/xp'
import { badgeStates } from '../data/badges'
import { WorldMap } from '../components/WorldMap'
import { MapModal } from '../components/MapModal'

export function StatsScreen() {
  const { people } = usePeople()
  const navigate = useNavigate()
  const [home, setHome] = useHomeCountry()

  const s = useMemo(() => {
    const beijos = people.filter((p) => p.relationship === 'beijo').length
    const sexo = people.filter((p) => p.relationship === 'sexo').length
    const legendarias = people.filter((p) => p.legendary).length
    const withCountry = people.filter((p) => p.country)
    const visited = new Set(withCountry.map((p) => p.country as string))
    const nacional = people.filter((p) => p.country === home).length
    const internacional = withCountry.filter((p) => p.country !== home).length
    const rated = people.filter((p) => p.rating > 0)
    const avg = rated.length
      ? rated.reduce((sum, p) => sum + p.rating, 0) / rated.length
      : 0

    const typeCounts = new Map<string, number>()
    for (const p of people)
      for (const t of p.types) typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1)
    const types = POKE_TYPES.map((t) => ({ ...t, count: typeCounts.get(t.key) ?? 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)

    const catCounts = LEGENDARY_CATS.map((c) => ({
      ...c,
      count: people.filter((p) => p.legendary && p.legendaryCats.includes(c.key)).length,
    })).filter((c) => c.count > 0)

    const countryCounts = [...visited]
      .map((id) => ({ id, name: countryName(id), count: withCountry.filter((p) => p.country === id).length }))
      .sort((a, b) => b.count - a.count)

    return {
      total: people.length,
      beijos,
      sexo,
      legendarias,
      visited,
      countries: visited.size,
      nacional,
      internacional,
      avg,
      types,
      catCounts,
      countryCounts,
      maxType: types.length ? types[0].count : 1,
    }
  }, [people, home])

  const lvl = useMemo(() => levelInfo(totalXp(people, home)), [people, home])
  const badges = useMemo(() => badgeStates({ people, home }), [people, home])
  const badgesEarned = badges.filter((b) => b.earned).length
  const [mapOpen, setMapOpen] = useState(false)

  return (
    <div className="screen stats">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">Estatísticas</h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="stats__body">
        {/* Level / XP */}
        <section className="level-card">
          <div className="level-card__top">
            <span className="level-card__badge">
              <Zap size={18} /> Nível {lvl.level}
            </span>
            <span className="level-card__xp">{lvl.xp} XP</span>
          </div>
          <div className="level-card__bar">
            <div className="level-card__fill" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <span className="level-card__next">
            Faltam <b>{lvl.toNext} XP</b> para o nível {lvl.level + 1}
          </span>
        </section>

        {/* Badges link */}
        <Link to="/badges" className="link-card">
          <span className="link-card__icon" style={{ background: '#E0A62A' }}>
            <Award size={20} />
          </span>
          <span className="link-card__text">
            <b>Badges</b>
            <small>{badgesEarned} de {badges.length} desbloqueados</small>
          </span>
          <ChevronRight size={20} className="link-card__chevron" />
        </Link>

        {/* Summary tiles */}
        <div className="tiles">
          <Tile value={s.total} label="Total" icon={<Star size={16} />} color="#5C90F0" />
          <Tile value={s.beijos} label="Beijos" icon={<Heart size={16} />} color="#EC5A96" />
          <Tile value={s.sexo} label="Sexo" icon={<Flame size={16} />} color="#E23B4E" />
          <Tile value={s.legendarias} label="Lendárias" icon={<Crown size={16} />} color="#E0A62A" />
          <Tile value={s.countries} label="Países" icon={<Globe size={16} />} color="#2FAE82" />
          <Tile value={s.avg ? s.avg.toFixed(1) : '—'} label="Média" icon={<Star size={16} />} color="#F5B23E" />
        </div>

        {/* World map */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2>Mapa-múndi</h2>
            <button className="map-expand" onClick={() => setMapOpen(true)}>
              <Maximize2 size={15} /> Expandir
            </button>
          </div>
          <button
            className="map-tap"
            onClick={() => setMapOpen(true)}
            aria-label="Expandir mapa"
          >
            <WorldMap visited={s.visited} homeId={home} accent="#EC5A96" />
          </button>
          <div className="map-legend">
            <span className="stats-card__sub">{s.countries} de {COUNTRIES.length} países</span>
            <span><i style={{ background: '#F5B23E' }} /> O teu país</span>
            <span><i style={{ background: '#EC5A96' }} /> Apanhados</span>
            <span className="map-legend__nat">Nacional {s.nacional} · Internacional {s.internacional}</span>
          </div>
        </section>

        {/* Home country selector */}
        <div className="field">
          <label htmlFor="home">O teu país (define a Dex Nacional)</label>
          <select
            id="home"
            className="input"
            value={home}
            onChange={(e) => setHome(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Countries breakdown */}
        {s.countryCounts.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2>Por país</h2>
            </div>
            <ul className="rank-list">
              {s.countryCounts.map((c) => (
                <li key={c.id}>
                  <span className="rank-list__name">{c.name || '—'}</span>
                  <span className="rank-list__count">{c.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Types breakdown */}
        {s.types.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2>Por tipo</h2>
            </div>
            <div className="type-bars">
              {s.types.map((t) => (
                <div className="type-bar" key={t.key}>
                  <span className="type-bar__label">{getType(t.key).label}</span>
                  <div className="type-bar__track">
                    <div
                      className="type-bar__fill"
                      style={{ width: `${(t.count / s.maxType) * 100}%`, background: t.color }}
                    />
                  </div>
                  <span className="type-bar__count">{t.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Legendary categories */}
        {s.catCounts.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2>Lendárias por categoria</h2>
            </div>
            <div className="cat-stat-list">
              {s.catCounts.map((c) => (
                <span className="cat-stat" key={c.key}>
                  <Crown size={13} /> {c.label} <b>{c.count}</b>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {mapOpen && (
        <MapModal
          visited={s.visited}
          homeId={home}
          accent="#EC5A96"
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  )
}

function Tile({
  value,
  label,
  icon,
  color,
}: {
  value: number | string
  label: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="tile">
      <span className="tile__icon" style={{ background: color }}>
        {icon}
      </span>
      <span className="tile__value">{value}</span>
      <span className="tile__label">{label}</span>
    </div>
  )
}
