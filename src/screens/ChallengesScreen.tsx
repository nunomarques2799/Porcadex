import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Swords, Check, X } from 'lucide-react'
import { useIncomingChallenges, acceptChallenge, setBattleStatus, type BattleRow } from '../lib/battles'
import { useFriends } from '../lib/friends'
import { getType } from '../data/pokeTypes'
import type { Person } from '../types'
import { MyPersonPicker } from '../components/MyPersonPicker'

export function ChallengesScreen() {
  const navigate = useNavigate()
  const { challenges } = useIncomingChallenges()
  const { friends } = useFriends()
  const [accepting, setAccepting] = useState<BattleRow | null>(null)

  const nameOf = (userId: string) =>
    friends.find((f) => f.id === userId)?.name.split(' ')[0] ?? 'Um amigo'

  const onAccept = async (person: Person) => {
    if (!accepting) return
    const battleId = accepting.id
    setAccepting(null)
    const r = await acceptChallenge(battleId, person)
    if (!r.error) navigate(`/battle/live/${battleId}`)
  }

  return (
    <div className="screen">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">
          <Swords size={18} /> Desafios
        </h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="me__body">
        {challenges.length === 0 ? (
          <p className="muted-block">Não tens desafios pendentes.</p>
        ) : (
          <div className="challenge-list">
            {challenges.map((c) => {
              const foe = c.setup.a
              const t = getType(foe?.types?.[0])
              return (
                <div className="challenge-card" key={c.id} style={{ ['--accent' as string]: t.color }}>
                  <div className="challenge-card__body">
                    <span className="challenge-card__who">{nameOf(c.challenger)} desafiou-te!</span>
                    <span className="challenge-card__foe">
                      com <strong>{foe?.name ?? 'alguém'}</strong>
                      {foe ? ` · Nv${foe.level}` : ''}
                    </span>
                  </div>
                  <div className="challenge-card__actions">
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => void setBattleStatus(c.id, 'declined')}
                    >
                      <X size={15} /> Recusar
                    </button>
                    <button className="btn btn--primary btn--sm" onClick={() => setAccepting(c)}>
                      <Check size={15} /> Aceitar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {accepting && (
        <MyPersonPicker
          title="Escolhe quem vai lutar"
          onClose={() => setAccepting(null)}
          onSelect={(p) => void onAccept(p)}
        />
      )}
    </div>
  )
}
