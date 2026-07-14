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
  Repeat,
  Activity,
  Rocket,
  Compass,
  Medal,
  Gem,
  ShieldAlert,
  VenetianMask,
  UserX,
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
const distinctLegendCats = (p: Person[]) =>
  new Set(p.filter((x) => x.legendary).flatMap((x) => x.legendaryCats)).size
const encounters = (x: Person) =>
  x.moments.filter((m) => m.kind === 'beijo' || m.kind === 'sexo').length
const maxEncounters = (p: Person[]) =>
  p.reduce((m, x) => Math.max(m, encounters(x)), 0)
const totalEncounters = (p: Person[]) =>
  p.reduce((s, x) => s + encounters(x), 0)
const userCheatCount = (p: Person[]) =>
  p.reduce((s, x) => s + x.moments.filter((m) => m.userCheated).length, 0)
const personCheatCount = (p: Person[]) =>
  p.reduce((s, x) => s + x.moments.filter((m) => m.personCheated).length, 0)
const cheatVictimsCount = (p: Person[]) =>
  p.filter((x) => x.moments.some((m) => m.personCheated)).length

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
  {
    id: 'second-round',
    title: 'Segunda Ronda',
    desc: 'Repete com a mesma pessoa (2 momentos)',
    icon: Repeat,
    color: '#EC5A96',
    target: 2,
    value: (c) => maxEncounters(c.people),
  },
  {
    id: 'regular',
    title: 'Cliente Habitual',
    desc: '5 momentos com a mesma pessoa',
    icon: Repeat,
    color: '#E23B4E',
    target: 5,
    value: (c) => maxEncounters(c.people),
  },
  {
    id: 'marathon',
    title: 'Maratonista',
    desc: '25 momentos (beijo/sexo) no total',
    icon: Activity,
    color: '#C22E28',
    target: 25,
    value: (c) => totalEncounters(c.people),
  },
  {
    id: 'kisser-25',
    title: 'Beijoqueiro',
    desc: '25 beijos',
    icon: Heart,
    color: '#D6417E',
    target: 25,
    value: (c) => beijos(c.people),
  },
  {
    id: 'insatiable',
    title: 'Insaciável',
    desc: '50 vezes sexo',
    icon: Flame,
    color: '#9E241F',
    target: 50,
    value: (c) => sexo(c.people),
  },
  {
    id: 'people-50',
    title: 'Estrela do Rock',
    desc: '50 pessoas na coleção',
    icon: Rocket,
    color: '#4E86EB',
    target: 50,
    value: (c) => c.people.length,
  },
  {
    id: 'explorer',
    title: 'Explorador',
    desc: 'Pessoas de 5 países diferentes',
    icon: Compass,
    color: '#2FAE82',
    target: 5,
    value: (c) => distinctCountries(c.people),
  },
  {
    id: 'jetsetter',
    title: 'Cidadão do Mundo',
    desc: '10 pessoas internacionais',
    icon: Plane,
    color: '#1FA6AF',
    target: 10,
    value: (c) => intl(c.people, c.home),
  },
  {
    id: 'pantheon',
    title: 'Panteão',
    desc: 'Lendárias das 6 categorias',
    icon: Trophy,
    color: '#E0A62A',
    target: 6,
    value: (c) => distinctLegendCats(c.people),
  },
  {
    id: 'olympus',
    title: 'Olimpo',
    desc: '5 lendárias',
    icon: Crown,
    color: '#B8860B',
    target: 5,
    value: (c) => legendaries(c.people),
  },
  {
    id: 'favorites',
    title: 'Coração de Ouro',
    desc: '5 favoritos',
    icon: Medal,
    color: '#EC5A96',
    target: 5,
    value: (c) => c.people.filter((p) => p.favorite).length,
  },
  {
    id: 'connoisseur',
    title: 'Bom Gosto',
    desc: '3 pessoas com 5 estrelas',
    icon: Gem,
    color: '#F5B23E',
    target: 3,
    value: (c) => c.people.filter((p) => p.rating >= 5).length,
  },
  {
    id: 'ball-master',
    title: 'Mestre das Bolas',
    desc: 'Usa as 10 pokébolas',
    icon: Circle,
    color: '#6A2C86',
    target: 10,
    value: (c) => distinctBalls(c.people),
  },
  {
    id: 'level-10',
    title: 'Lenda Viva',
    desc: 'Chega ao nível 10',
    icon: Zap,
    color: '#E0A62A',
    target: 10,
    value: (c) => levelInfo(totalXp(c.people, c.home)).level,
  },
  {
    id: 'first-cheat',
    title: 'Fruto Proibido',
    desc: 'Regista a tua primeira traição',
    icon: ShieldAlert,
    color: '#B4204C',
    target: 1,
    value: (c) => userCheatCount(c.people),
  },
  {
    id: 'cheater-5',
    title: 'Traidor de Série',
    desc: '5 traições tuas',
    icon: VenetianMask,
    color: '#8E1836',
    target: 5,
    value: (c) => userCheatCount(c.people),
  },
  {
    id: 'cheater-15',
    title: 'Rei da Traição',
    desc: '15 traições tuas',
    icon: VenetianMask,
    color: '#5A0F22',
    target: 15,
    value: (c) => userCheatCount(c.people),
  },
  {
    id: 'homewrecker',
    title: 'Destruidor de Lares',
    desc: 'A outra pessoa traiu 3 vezes contigo',
    icon: UserX,
    color: '#7C2E9E',
    target: 3,
    value: (c) => personCheatCount(c.people),
  },
  {
    id: 'homewrecker-10',
    title: 'Amante Profissional',
    desc: 'A outra pessoa traiu 10 vezes contigo',
    icon: UserX,
    color: '#4E1B66',
    target: 10,
    value: (c) => personCheatCount(c.people),
  },
  {
    id: 'many-victims',
    title: 'Coração Alheio',
    desc: '5 pessoas comprometidas na tua lista',
    icon: ShieldAlert,
    color: '#B4204C',
    target: 5,
    value: (c) => cheatVictimsCount(c.people),
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
