import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Zap, Star, Trophy, Droplet, Heart, Flame, LogOut, Users, Copy } from 'lucide-react'
import { usePeople } from '../store/people'
import { useHomeCountry } from '../lib/settings'
import { useAuth } from '../lib/auth'
import { useFriends } from '../lib/friends'
import { useUserProfile, cycleInfo, PHASE_META } from '../lib/userProfile'
import type { Gender } from '../types'
import { totalXp, levelInfo } from '../data/xp'
import { formatNumber, formatDate } from '../lib/utils'
import { typeTheme } from '../data/pokeTypes'
import { Avatar } from '../components/Avatar'

export function MeScreen() {
  const navigate = useNavigate()
  const { people } = usePeople()
  const [home] = useHomeCountry()
  const [profile, setProfile] = useUserProfile()
  const { user, signOut } = useAuth()
  const { friends, myCode } = useFriends()
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!myCode) return
    try {
      await navigator.clipboard.writeText(myCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const trainer = useMemo(
    () => levelInfo(totalXp(people, home, profile)),
    [people, home, profile],
  )

  const enriched = useMemo(
    () =>
      people.map((p) => {
        const encounters = p.moments.filter(
          (m) => m.kind === 'beijo' || m.kind === 'sexo',
        ).length
        return {
          person: p,
          encounters,
          xp: p.battle.xp,
          level: p.battle.level,
        }
      }),
    [people],
  )

  const topMoments = [...enriched]
    .filter((e) => e.encounters > 0)
    .sort((a, b) => b.encounters - a.encounters)
    .slice(0, 3)

  const topLevels = [...enriched]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3)

  const cycle = cycleInfo(profile)

  return (
    <div className="screen me">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">Meu perfil</h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="me__body">
        {/* Trainer card */}
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
            {profile.name ? <b>{profile.name}</b> : 'Treinador'} — faltam <b>{trainer.toNext} XP</b> para o nível {trainer.level + 1}
          </span>
        </section>

        {/* Profile config */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2>Perfil</h2>
            {user && <span className="me__email">{user.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="me-name">Nome</label>
            <input
              id="me-name"
              className="input"
              value={profile.name}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder="O teu nome"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>Sexo</label>
            <div className="gender-picker">
              {(
                [
                  { key: 'M', label: 'Masculino' },
                  { key: 'F', label: 'Feminino' },
                  { key: 'O', label: 'Outro' },
                ] as { key: Gender; label: string }[]
              ).map((g) => (
                <button
                  key={g.key}
                  type="button"
                  className={'gender-pick' + (profile.gender === g.key ? ' is-active' : '')}
                  onClick={() =>
                    setProfile({ gender: profile.gender === g.key ? undefined : g.key })
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Fertility tracking for female users */}
        {profile.gender === 'F' && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2><Droplet size={16} style={{ verticalAlign: '-3px' }} /> Ciclo</h2>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="lp">Início do último período</label>
                <input
                  id="lp"
                  className="input"
                  type="date"
                  value={profile.lastPeriod ?? ''}
                  onChange={(e) => setProfile({ lastPeriod: e.target.value || undefined })}
                />
              </div>
              <div className="field">
                <label htmlFor="cl">Ciclo (dias)</label>
                <input
                  id="cl"
                  className="input"
                  type="number"
                  min={20}
                  max={40}
                  value={profile.cycleLength}
                  onChange={(e) => setProfile({ cycleLength: Number(e.target.value) || 28 })}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pl">Duração do período (dias)</label>
              <input
                id="pl"
                className="input"
                type="number"
                min={2}
                max={10}
                value={profile.periodLength}
                onChange={(e) => setProfile({ periodLength: Number(e.target.value) || 5 })}
              />
            </div>

            {cycle && (
              <div className="cycle">
                <div
                  className="cycle__phase"
                  style={{ background: PHASE_META[cycle.phase].color }}
                >
                  <span className="cycle__phase-label">{PHASE_META[cycle.phase].label}</span>
                  <span className="cycle__phase-desc">{PHASE_META[cycle.phase].desc}</span>
                </div>
                <ul className="cycle__facts">
                  <li>
                    <span>Dia do ciclo</span>
                    <b>{cycle.dayOfCycle}</b>
                  </li>
                  <li>
                    <span>Janela fértil</span>
                    <b>
                      {formatDate(iso(cycle.fertileStart))} – {formatDate(iso(cycle.fertileEnd))}
                    </b>
                  </li>
                  <li>
                    <span>Ovulação estimada</span>
                    <b>{formatDate(iso(cycle.ovulation))}</b>
                  </li>
                  <li>
                    <span>Próximo período</span>
                    <b>
                      {formatDate(iso(cycle.nextPeriod))}
                      {` (em ${cycle.daysToNextPeriod} d.)`}
                    </b>
                  </li>
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Friends */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2><Users size={16} style={{ verticalAlign: '-3px' }} /> Amigos</h2>
            <Link to="/friends" className="stats-card__link">Gerir</Link>
          </div>
          <div className="friend-code">
            <span className="friend-code__value">{myCode ?? '—'}</span>
            <button
              type="button"
              className="btn btn--ghost friend-code__copy"
              onClick={copyCode}
              disabled={!myCode}
            >
              <Copy size={15} /> {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="hint">
            {friends.length === 0
              ? 'Ainda sem amigos. Partilha o teu código.'
              : `${friends.length} ${friends.length === 1 ? 'amigo' : 'amigos'}.`}
          </p>
        </section>

        {/* Top by moments */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2><Heart size={16} style={{ verticalAlign: '-3px' }} /> Top 3 momentos</h2>
          </div>
          {topMoments.length === 0 ? (
            <p className="muted-block">Ainda não há momentos suficientes.</p>
          ) : (
            <ul className="top-list">
              {topMoments.map((e, i) => (
                <TopRow
                  key={e.person.id}
                  rank={i + 1}
                  personId={e.person.id}
                  name={e.person.name}
                  number={e.person.number}
                  type={e.person.types[0]}
                  avatarId={e.person.avatarId}
                  metric={`${e.encounters}`}
                  metricLabel="momentos"
                  icon={<Flame size={14} />}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Top by level */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2><Trophy size={16} style={{ verticalAlign: '-3px' }} /> Top 3 níveis</h2>
          </div>
          {topLevels.length === 0 ? (
            <p className="muted-block">Adiciona pessoas para ver aqui os teus troféus.</p>
          ) : (
            <ul className="top-list">
              {topLevels.map((e, i) => (
                <TopRow
                  key={e.person.id}
                  rank={i + 1}
                  personId={e.person.id}
                  name={e.person.name}
                  number={e.person.number}
                  type={e.person.types[0]}
                  avatarId={e.person.avatarId}
                  metric={`Lv ${e.level}`}
                  metricLabel={`${e.xp} XP`}
                  icon={<Star size={14} />}
                />
              ))}
            </ul>
          )}
        </section>

        <button
          className="btn btn--danger-ghost me__signout"
          onClick={() => void signOut()}
        >
          <LogOut size={17} /> Terminar sessão
        </button>
      </div>
    </div>
  )
}

function iso(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function TopRow({
  rank,
  personId,
  name,
  number,
  type,
  avatarId,
  metric,
  metricLabel,
  icon,
}: {
  rank: number
  personId: string
  name: string
  number: number
  type?: string
  avatarId?: string
  metric: string
  metricLabel: string
  icon: React.ReactNode
}) {
  const accent = typeTheme(type).accent
  return (
    <li>
      <Link to={`/person/${personId}`} className="top-row">
        <span className="top-row__rank" style={{ background: accent }}>#{rank}</span>
        <Avatar name={name} type={type} avatarId={avatarId} size={40} />
        <div className="top-row__text">
          <span className="top-row__name">{name}</span>
          <span className="top-row__sub">{formatNumber(number)}</span>
        </div>
        <div className="top-row__metric">
          <span className="top-row__val">{icon} {metric}</span>
          <span className="top-row__lbl">{metricLabel}</span>
        </div>
      </Link>
    </li>
  )
}
