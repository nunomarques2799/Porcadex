import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Swords, Check, X } from 'lucide-react'
import {
  useIncomingChallenges,
  acceptChallenge,
  setBattleStatus,
  type BattleRow,
} from '../lib/battles'
import { useFriends } from '../lib/friends'
import { usePeople } from '../store/people'
import { getType } from '../data/pokeTypes'
import { normalizeTeamSetup } from '../data/battle'
import { TeamPicker } from '../components/TeamPicker'

export function ChallengesScreen() {
  const navigate = useNavigate()
  const { challenges } = useIncomingChallenges()
  const { friends } = useFriends()
  const { people } = usePeople()
  const [accepting, setAccepting] = useState<BattleRow | null>(null)
  const [error, setError] = useState('')

  const nameOf = (userId: string) =>
    friends.find((f) => f.id === userId)?.name.split(' ')[0] ?? 'Um amigo'

  /** Linhas antigas podem não ter `team_size`: infere-se do setup. */
  const sizeOf = (c: BattleRow) => c.team_size || normalizeTeamSetup(c.setup?.a).length || 1

  const onAccept = async (ids: string[]) => {
    if (!accepting) return
    const battleId = accepting.id
    const team = ids
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
    setAccepting(null)
    setError('')
    const r = await acceptChallenge(battleId, team)
    if (r.error) setError(r.error)
    else navigate(`/battle/live/${battleId}`)
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
        {error && <p className="friend-rating__msg friend-rating__msg--err">{error}</p>}
        {challenges.length === 0 ? (
          <p className="muted-block">Não tens desafios pendentes.</p>
        ) : (
          <div className="challenge-list">
            {challenges.map((c) => {
              const team = normalizeTeamSetup(c.setup?.a)
              const lead = team[0]
              const size = sizeOf(c)
              const t = getType(lead?.types?.[0])
              const enough = people.length >= size
              return (
                <div className="challenge-card" key={c.id} style={{ ['--accent' as string]: t.color }}>
                  <div className="challenge-card__body">
                    <span className="challenge-card__who">
                      {nameOf(c.challenger)} desafiou-te! <b>{size}v{size}</b>
                    </span>
                    <span className="challenge-card__foe">
                      com{' '}
                      <strong>
                        {team.length
                          ? team.map((f) => f.name.split(' ')[0]).join(', ')
                          : 'alguém'}
                      </strong>
                    </span>
                    {!enough && (
                      <span className="challenge-card__foe">
                        Precisas de {size} pessoas para aceitar.
                      </span>
                    )}
                  </div>
                  <div className="challenge-card__actions">
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => void setBattleStatus(c.id, 'declined')}
                    >
                      <X size={15} /> Recusar
                    </button>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => setAccepting(c)}
                      disabled={!enough}
                    >
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
        <TeamPicker
          title={`Escolhe ${sizeOf(accepting)} para lutar`}
          size={sizeOf(accepting)}
          myPeople={people}
          friends={[]}
          source="me"
          selected={[]}
          onClose={() => setAccepting(null)}
          onConfirm={(_, ids) => void onAccept(ids)}
        />
      )}
    </div>
  )
}
