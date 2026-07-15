// Avisa quando um badge é desbloqueado, em qualquer ecrã da app.
//
// Não há evento de "badge ganho" em lado nenhum: os badges são derivados das
// pessoas a cada render. Por isso guarda-se o conjunto já ganho e compara-se —
// o que aparecer de novo é festejado.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { usePeople } from '../store/people'
import { useAuth } from '../lib/auth'
import { useHomeCountry } from '../lib/settings'
import { useUserProfile } from '../lib/userProfile'
import { badgeStates, BADGES, type BadgeDef } from '../data/badges'
import { playSfx, SFX } from '../lib/audio'

/** Quanto tempo cada aviso fica no ecrã. */
const SHOW_MS = 4200

export function BadgeToast() {
  const { people, loading } = usePeople()
  const { user } = useAuth()
  const [home] = useHomeCountry()
  const [profile] = useUserProfile()

  const [queue, setQueue] = useState<BadgeDef[]>([])
  const [leaving, setLeaving] = useState(false)
  /** Ids JÁ ANUNCIADOS (não "atualmente ganhos"): só cresce, nunca encolhe.
   *  Se apagares uma pessoa e caíres abaixo do alvo, voltar a subir não
   *  repete a festa. `null` = ainda não lemos o que estava guardado. */
  const known = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (loading || !user) return
    const key = 'porcadex.badges.' + user.id
    const earned = new Set(
      badgeStates({ people, home, cycle: profile })
        .filter((s) => s.earned)
        .map((s) => s.def.id),
    )

    if (known.current === null) {
      const stored = localStorage.getItem(key)
      if (!stored) {
        // Primeira vez: semeia em silêncio. Sem isto, quem já tem badges
        // levava com todos os avisos de uma vez ao abrir a app.
        known.current = earned
        localStorage.setItem(key, JSON.stringify([...earned]))
        return
      }
      try {
        known.current = new Set(JSON.parse(stored) as string[])
      } catch {
        known.current = earned
      }
    }

    const fresh = [...earned].filter((id) => !known.current!.has(id))
    if (!fresh.length) return

    known.current = earned
    localStorage.setItem(key, JSON.stringify([...earned]))
    const defs = fresh
      .map((id) => BADGES.find((b) => b.id === id))
      .filter((b): b is BadgeDef => !!b)
    if (defs.length) setQueue((q) => [...q, ...defs])
  }, [people, home, profile, loading, user])

  const current = queue[0]

  // Cada aviso toca o seu som e sai sozinho passado um bocado.
  useEffect(() => {
    if (!current) return
    setLeaving(false)
    playSfx(SFX.levelUp)
    const out = setTimeout(() => setLeaving(true), SHOW_MS - 350)
    const next = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS)
    return () => {
      clearTimeout(out)
      clearTimeout(next)
    }
  }, [current])

  if (!current) return null
  const Icon = current.icon

  return (
    <div className={'badge-toast' + (leaving ? ' is-leaving' : '')} role="status" aria-live="polite">
      <Link to="/badges" className="badge-toast__body" onClick={() => setQueue((q) => q.slice(1))}>
        <span className="badge-toast__icon" style={{ background: current.color }}>
          <Icon size={24} />
          <span className="badge-toast__shine" />
        </span>
        <span className="badge-toast__text">
          <small>Badge desbloqueado!</small>
          <b>{current.title}</b>
          <small>{current.desc}</small>
        </span>
      </Link>
      <button
        className="badge-toast__close"
        onClick={() => setQueue((q) => q.slice(1))}
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
      {queue.length > 1 && <span className="badge-toast__more">+{queue.length - 1}</span>}
    </div>
  )
}
