import type { LucideIcon } from 'lucide-react'
import {
  Sparkles,
  Users,
  Flame,
  Heart,
  Plane,
  Globe,
  Crown,
  Shapes,
  Trophy,
  Star,
  Circle,
  Zap,
} from 'lucide-react'
import type { Person } from '../types'
import { totalXp, levelInfo } from './xp'

export interface BadgeCtx {
  people: Person[]
  home: string
}

export interface BadgeDef {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  color: string
  target: number
  value: (ctx: BadgeCtx) => number
}

const beijos = (p: Person[]) => p.filter((x) => x.relationship === 'beijo').length
const sexo = (p: Person[]) => p.filter((x) => x.relationship === 'sexo').length
const intl = (p: Person[], home: string) =>
  p.filter((x) => x.country && x.country !== home).length
const distinctCountries = (p: Person[]) =>
  new Set(p.filter((x) => x.country).map((x) => x.country)).size
const distinctTypes = (p: Person[]) => new Set(p.flatMap((x) => x.types)).size
const distinctBalls = (p: Person[]) => new Set(p.map((x) => x.ball)).size
const legendaries = (p: Person[]) => p.filter((x) => x.legendary).length

export const BADGES: BadgeDef[] = [
  {
    id: 'debut',
    title: 'Estreia',
    desc: 'Adiciona a primeira pessoa',
    icon: Sparkles,
    color: '#5C90F0',
    target: 1,
    value: (c) => c.people.length,
  },
  {
    id: 'collector',
    title: 'Colecionador',
    desc: 'Chega às 5 pessoas',
    icon: Users,
    color: '#5C90F0',
    target: 5,
    value: (c) => c.people.length,
  },
  {
    id: 'addict',
    title: 'Viciado',
    desc: '25 pessoas na coleção',
    icon: Users,
    color: '#4E86EB',
    target: 25,
    value: (c) => c.people.length,
  },
  {
    id: 'kisser',
    title: 'Bom de Boca',
    desc: '10 beijos',
    icon: Heart,
    color: '#EC5A96',
    target: 10,
    value: (c) => beijos(c.people),
  },
  {
    id: 'lover',
    title: 'Amante',
    desc: '10 vezes sexo',
    icon: Flame,
    color: '#E23B4E',
    target: 10,
    value: (c) => sexo(c.people),
  },
  {
    id: 'machine',
    title: 'Máquina',
    desc: '25 vezes sexo',
    icon: Flame,
    color: '#C22E28',
    target: 25,
    value: (c) => sexo(c.people),
  },
  {
    id: 'passport',
    title: 'Passaporte',
    desc: '3 pessoas internacionais',
    icon: Plane,
    color: '#2FAE82',
    target: 3,
    value: (c) => intl(c.people, c.home),
  },
  {
    id: 'globetrotter',
    title: 'Mundano',
    desc: 'Pessoas de 10 países diferentes',
    icon: Globe,
    color: '#1FA6AF',
    target: 10,
    value: (c) => distinctCountries(c.people),
  },
  {
    id: 'legend-hunter',
    title: 'Caça-Lendas',
    desc: 'Apanha 1 lendária',
    icon: Crown,
    color: '#E0A62A',
    target: 1,
    value: (c) => legendaries(c.people),
  },
  {
    id: 'legend-tamer',
    title: 'Domador de Lendas',
    desc: '3 lendárias',
    icon: Crown,
    color: '#D99A1A',
    target: 3,
    value: (c) => legendaries(c.people),
  },
  {
    id: 'trainer',
    title: 'Treinador',
    desc: 'Pessoas de 6 tipos diferentes',
    icon: Shapes,
    color: '#A33EA1',
    target: 6,
    value: (c) => distinctTypes(c.people),
  },
  {
    id: 'master',
    title: 'Mestre Pokémon',
    desc: 'Apanha os 18 tipos',
    icon: Trophy,
    color: '#6F35FC',
    target: 18,
    value: (c) => distinctTypes(c.people),
  },
  {
    id: 'perfection',
    title: 'Perfeição',
    desc: 'Uma pessoa com 5 estrelas',
    icon: Star,
    color: '#F5B23E',
    target: 1,
    value: (c) => c.people.filter((p) => p.rating >= 5).length,
  },
  {
    id: 'ball-collector',
    title: 'Colecionador de Bolas',
    desc: 'Usa 5 pokébolas diferentes',
    icon: Circle,
    color: '#E23B4E',
    target: 5,
    value: (c) => distinctBalls(c.people),
  },
  {
    id: 'level-5',
    title: 'Veterano',
    desc: 'Chega ao nível 5',
    icon: Zap,
    color: '#F2C21C',
    target: 5,
    value: (c) => levelInfo(totalXp(c.people, c.home)).level,
  },
]

export interface BadgeState {
  def: BadgeDef
  value: number
  earned: boolean
  progress: number // 0–1
}

export function badgeStates(ctx: BadgeCtx): BadgeState[] {
  return BADGES.map((def) => {
    const value = Math.min(def.value(ctx), def.target)
    return {
      def,
      value,
      earned: value >= def.target,
      progress: Math.min(1, value / def.target),
    }
  })
}
