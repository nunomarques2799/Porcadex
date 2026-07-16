import { useState } from 'react'
import {
  Plus,
  Flame,
  Swords,
  Trophy,
  Users,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTutorial } from '../lib/tutorial'

interface Step {
  icon: LucideIcon
  /** Cor de destaque do passo (círculo do ícone). */
  color: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    color: '#5C90F0',
    title: 'Bem-vindo/a à Porcadex!',
    body: 'A tua coleção pessoal de quem já passou por aqui — ao estilo Pokédex. Vamos a uma volta rápida?',
  },
  {
    icon: Plus,
    color: '#EC5A96',
    title: 'Adiciona pessoas',
    body: 'Toca no botão + para registar cada pessoa: nome, foto, país e a pokébola em que a apanhaste.',
  },
  {
    icon: Flame,
    color: '#E23B4E',
    title: 'Relação e tipos',
    body: 'Marca cada uma como Beijo ou Sexo e dá-lhe um tipo ao estilo Pokémon. A cor do cartão muda conforme o tipo.',
  },
  {
    icon: Swords,
    color: '#7C5CF0',
    title: 'Combate e comparar',
    body: 'Cada porca tem stats de combate. Desafia, compara duas lado a lado e descobre quem leva a melhor.',
  },
  {
    icon: Trophy,
    color: '#E0A62A',
    title: 'Níveis, XP e badges',
    body: 'Cada pessoa dá XP. Sobe de nível e desbloqueia badges à medida que a tua coleção cresce.',
  },
  {
    icon: Users,
    color: '#2EA98A',
    title: 'Amigos',
    body: 'Adiciona amigos pelo código, espreita as coleções deles e avaliem as porcas uns dos outros.',
  },
]

/** Carrossel de boas-vindas mostrado uma única vez, em contas novas. */
export function Tutorial() {
  const { show, dismiss } = useTutorial()
  const [i, setI] = useState(0)

  if (!show) return null

  const step = STEPS[i]
  const last = i === STEPS.length - 1
  const Icon = step.icon

  const next = () => {
    if (last) dismiss()
    else setI((n) => n + 1)
  }
  const back = () => setI((n) => Math.max(0, n - 1))

  return (
    <div className="tut" role="dialog" aria-modal="true" aria-label="Como funciona a Porcadex">
      <div className="tut__scrim" />
      <div className="tut__card">
        <button className="tut__skip" onClick={dismiss} type="button">
          Saltar
        </button>

        <div className="tut__icon" style={{ background: step.color }}>
          <Icon size={40} strokeWidth={2.2} />
        </div>

        <h2 className="tut__title">{step.title}</h2>
        <p className="tut__body">{step.body}</p>

        <div className="tut__dots" aria-hidden="true">
          {STEPS.map((_, n) => (
            <span key={n} className={'tut__dot' + (n === i ? ' is-active' : '')} />
          ))}
        </div>

        <div className="tut__nav">
          {i > 0 ? (
            <button className="btn btn--ghost tut__back" onClick={back} type="button">
              Anterior
            </button>
          ) : (
            <span className="tut__back" />
          )}
          <button className="btn btn--primary tut__next" onClick={next} type="button">
            {last ? (
              <>
                <Check size={17} /> Começar
              </>
            ) : (
              <>
                Seguinte <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
