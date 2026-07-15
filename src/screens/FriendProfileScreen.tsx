import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Zap, Users, Swords } from 'lucide-react'
import { useFriendPeople, useFriendProfile } from '../lib/friendPeople'
import { publicTotalXp, levelInfo } from '../data/xp'
import { PersonCard } from '../components/PersonCard'
import { MyPersonPicker } from '../components/MyPersonPicker'
import { challengeFriend } from '../lib/battles'
import type { Person } from '../types'
import { useHomeCountry } from '../lib/settings'

export function FriendProfileScreen() {
  const { friendId = '' } = useParams()
  const navigate = useNavigate()
  const { profile, loading: profLoading } = useFriendProfile(friendId)
  const { people, loading: peopleLoading } = useFriendPeople(friendId)
  const [myHome] = useHomeCountry()
  const [challenging, setChallenging] = useState(false)

  const onChallenge = async (person: Person) => {
    setChallenging(false)
    const r = await challengeFriend(person, friendId)
    if (r.id) navigate(`/battle/live/${r.id}`)
  }

  // Use the friend's own home country when possible for the trainer level
  // calculation; fall back to ours.
  const home = profile?.homeCountry ?? myHome
  const trainer = useMemo(() => levelInfo(publicTotalXp(people, home)), [people, home])

  const beijoCount = people.filter((p) => p.relationship === 'beijo').length
  const sexoCount = people.filter((p) => p.relationship === 'sexo').length

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

        <button
          className="btn btn--primary friend-compare-cta"
          onClick={() => setChallenging(true)}
        >
          <Swords size={17} /> Desafiar {profile?.name?.split(' ')[0] || 'amigo'}
        </button>
        <Link
          to={`/compare?friend=${friendId}`}
          className="btn btn--ghost friend-compare-cta"
        >
          Comparar com uma tua
        </Link>
      </div>

      {challenging && (
        <MyPersonPicker
          title="Escolhe quem vai lutar"
          onClose={() => setChallenging(false)}
          onSelect={(p) => void onChallenge(p)}
        />
      )}
    </div>
  )
}
