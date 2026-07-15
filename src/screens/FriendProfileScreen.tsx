import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Zap, Users, Swords, Trophy, Star } from 'lucide-react'
import { useFriendPeople, useFriendProfile } from '../lib/friendPeople'
import { publicTotalXp, levelInfo } from '../data/xp'
import { typeTheme } from '../data/pokeTypes'
import { formatNumber } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { PersonCard } from '../components/PersonCard'
import { useHomeCountry } from '../lib/settings'

export function FriendProfileScreen() {
  const { friendId = '' } = useParams()
  const navigate = useNavigate()
  const { profile, loading: profLoading } = useFriendProfile(friendId)
  const { people, loading: peopleLoading } = useFriendPeople(friendId)
  const [myHome] = useHomeCountry()

  // Use the friend's own home country when possible for the trainer level
  // calculation; fall back to ours.
  const home = profile?.homeCountry ?? myHome
  const trainer = useMemo(() => levelInfo(publicTotalXp(people, home)), [people, home])

  const beijoCount = people.filter((p) => p.relationship === 'beijo').length
  const sexoCount = people.filter((p) => p.relationship === 'sexo').length

  // Ranking por classificação média. Só entra quem já tem votos — sem isso,
  // o topo encher-se-ia de zeros e não diria nada.
  const ranking = useMemo(
    () =>
      people
        .filter((p) => (p.ratingCount ?? 0) > 0)
        .sort((a, b) => b.rating - a.rating || (b.ratingCount ?? 0) - (a.ratingCount ?? 0))
        .slice(0, 10),
    [people],
  )

  if (!profLoading && !profile) {
    return (
      <div className="screen screen--center">
        <p>Amigo não encontrado.</p>
        <Link to="/friends" className="btn btn--primary">Voltar</Link>
      </div>
    )
  }

  return (
    <div className="screen friend-profile">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">{profile?.name ?? '…'}</h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="me__body">
        {/* Trainer level */}
        <section className="level-card">
          <div className="level-card__top">
            <span className="level-card__badge">
              <Zap size={18} /> Nível {trainer.level}
            </span>
            <span className="level-card__xp">{trainer.xp} XP</span>
          </div>
          <div className="level-card__bar">
            <div className="level-card__fill" style={{ width: `${trainer.progress * 100}%` }} />
          </div>
          <span className="level-card__next">
            <b>{profile?.name || 'Amigo'}</b> — {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}
            {' · '} {beijoCount} beijo{beijoCount === 1 ? '' : 's'}
            {' · '} {sexoCount} sexo
          </span>
        </section>

        {/* Ranking by average rating */}
        {ranking.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2><Trophy size={16} style={{ verticalAlign: '-3px' }} /> Ranking</h2>
              <span className="stats-card__sub">Por avaliação média</span>
            </div>
            <ul className="top-list">
              {ranking.map((p, i) => (
                <li key={p.id}>
                  <Link
                    to={`/friends/${friendId}/person/${p.id}`}
                    className="top-row"
                  >
                    <span
                      className="top-row__rank"
                      style={{ background: typeTheme(p.types[0]).accent }}
                    >
                      #{i + 1}
                    </span>
                    <Avatar
                      name={p.name}
                      type={p.types[0]}
                      avatarId={p.avatarId}
                      ownerId={friendId}
                      size={40}
                    />
                    <div className="top-row__text">
                      <span className="top-row__name">{p.name}</span>
                      <span className="top-row__sub">{formatNumber(p.number)}</span>
                    </div>
                    <div className="top-row__metric">
                      <span className="top-row__val">
                        <Star size={14} /> {p.rating.toFixed(1)}
                      </span>
                      <span className="top-row__lbl">
                        {p.ratingCount} {p.ratingCount === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Grid of public people */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2><Users size={16} style={{ verticalAlign: '-3px' }} /> Porcadex de {profile?.name?.split(' ')[0] || 'amigo'}</h2>
          </div>
          {peopleLoading ? (
            <p className="muted-block">A carregar…</p>
          ) : people.length === 0 ? (
            <p className="muted-block">Sem pessoas visíveis.</p>
          ) : (
            <div className="grid">
              {people.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  linkBase={`/friends/${friendId}/person`}
                  ownerId={friendId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Os desafios montam-se no ecrã de Combate, onde se escolhe o modo e
            o tamanho da equipa. */}
        <Link
          to={`/battle?mode=friend&friend=${friendId}`}
          className="btn btn--primary friend-compare-cta"
        >
          <Swords size={17} /> Desafiar {profile?.name?.split(' ')[0] || 'amigo'}
        </Link>
        <Link
          to={`/compare?friend=${friendId}`}
          className="btn btn--ghost friend-compare-cta"
        >
          Comparar com uma tua
        </Link>
      </div>
    </div>
  )
}
