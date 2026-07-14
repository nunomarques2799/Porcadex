// Sistema de combate estilo Pokémon.
//
// Tudo aqui é DERIVADO da pessoa (tipo, características e stats de
// personalidade) — não é guardado na base de dados. Isto significa que
// funciona retroativamente para toda a gente e mantém-se sempre em sincronia
// com o perfil. Serve de fundação para as batalhas entre pessoas no futuro.

import type { Person, StatKey } from '../types'
import { personLevelInfo, personXp } from './xp'

/* ------------------------------------------------------------------ */
/* Stats de batalha                                                    */
/* ------------------------------------------------------------------ */

export type BattleStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'

/** Cada stat de batalha nasce de um dos 6 stats de personalidade e é depois
 *  moldado pelo(s) tipo(s) da pessoa — tal como cada espécie de Pokémon tem
 *  o seu próprio perfil de stats. */
export const BATTLE_STAT_META: {
  key: BattleStatKey
  label: string
  short: string
  from: StatKey
}[] = [
  { key: 'hp', label: 'HP', short: 'HP', from: 'confianca' },
  { key: 'atk', label: 'Ataque', short: 'Atq', from: 'carisma' },
  { key: 'def', label: 'Defesa', short: 'Def', from: 'lealdade' },
  { key: 'spa', label: 'Ataque Esp.', short: 'AtE', from: 'inteligencia' },
  { key: 'spd', label: 'Defesa Esp.', short: 'DeE', from: 'simpatia' },
  { key: 'spe', label: 'Velocidade', short: 'Vel', from: 'humor' },
]

/** Enviesamento de stats por tipo: o que faz um Steel ser tank e um Electric
 *  ser rápido. Valores somados (positivos ou negativos) à stat base. */
const TYPE_STAT_MODS: Record<string, Partial<Record<BattleStatKey, number>>> = {
  normal: { hp: 12 },
  fire: { atk: 12, spa: 12, def: -8 },
  water: { def: 12, hp: 10 },
  electric: { spe: 18, spa: 8 },
  grass: { hp: 12, def: 10, spe: -6 },
  ice: { spa: 12, spd: 8 },
  fighting: { atk: 18, hp: 8, spd: -8 },
  poison: { spd: 12, hp: 10 },
  ground: { atk: 14, def: 10, spe: -8 },
  flying: { spe: 16, atk: 8 },
  psychic: { spa: 16, spd: 10, def: -8 },
  bug: { spe: 10, def: 8 },
  rock: { def: 18, atk: 8, spe: -10 },
  ghost: { spa: 12, spe: 10 },
  dragon: { atk: 12, spa: 12, hp: 8 },
  dark: { atk: 12, spe: 10 },
  steel: { def: 18, spd: 12, spe: -10 },
  fairy: { spa: 12, spd: 12 },
}

export interface BattleStat {
  key: BattleStatKey
  label: string
  short: string
  value: number
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n))

/** Calcula as 6 stats de batalha da pessoa. Intervalo ~15–170. */
export function personBattleStats(person: Person): BattleStat[] {
  const types = person.types.length ? person.types : ['normal']
  return BATTLE_STAT_META.map((meta) => {
    const base = person.stats[meta.from] ?? 50 // 0–100
    // Modificador médio dos tipos para esta stat.
    const mod =
      types.reduce((sum, t) => sum + (TYPE_STAT_MODS[t]?.[meta.key] ?? 0), 0) /
      types.length
    const value = clamp(Math.round(35 + base * 0.85 + mod), 15, 170)
    return { key: meta.key, label: meta.label, short: meta.short, value }
  })
}

/** Soma das 6 stats — o "Base Stat Total" da pessoa. */
export function battleStatTotal(stats: BattleStat[]): number {
  return stats.reduce((sum, s) => sum + s.value, 0)
}

/* ------------------------------------------------------------------ */
/* Ataques                                                             */
/* ------------------------------------------------------------------ */

export type MoveCategory = 'fisico' | 'especial' | 'estatuto'

export interface Move {
  name: string
  type: string // chave de POKE_TYPES
  category: MoveCategory
  power: number // 0 para ataques de estatuto (defesa/buff)
}

export const MOVE_CATEGORY_META: Record<
  MoveCategory,
  { label: string; color: string }
> = {
  fisico: { label: 'Físico', color: '#E4572E' },
  especial: { label: 'Especial', color: '#4C6FE7' },
  estatuto: { label: 'Estatuto', color: '#6B7A8F' },
}

/** Movepool por tipo — 4 ataques cada, misturando físicos, especiais e de
 *  estatuto (defesa/buff). Nomes com o tom da app. */
const TYPE_MOVEPOOLS: Record<string, Move[]> = {
  normal: [
    { name: 'Marrada', type: 'normal', category: 'fisico', power: 40 },
    { name: 'Investida', type: 'normal', category: 'fisico', power: 55 },
    { name: 'Encontrão', type: 'normal', category: 'fisico', power: 70 },
    { name: 'Charme', type: 'normal', category: 'estatuto', power: 0 },
  ],
  fire: [
    { name: 'Beijo Ardente', type: 'fire', category: 'especial', power: 65 },
    { name: 'Fogo no Rabo', type: 'fire', category: 'fisico', power: 70 },
    { name: 'Labareda', type: 'fire', category: 'especial', power: 55 },
    { name: 'Onda de Calor', type: 'fire', category: 'especial', power: 90 },
  ],
  water: [
    { name: 'Salpico Safado', type: 'water', category: 'especial', power: 40 },
    { name: 'Jato Molhado', type: 'water', category: 'especial', power: 60 },
    { name: 'Maré Alta', type: 'water', category: 'especial', power: 75 },
    { name: 'Tsunami', type: 'water', category: 'especial', power: 95 },
  ],
  electric: [
    { name: 'Faísca', type: 'electric', category: 'fisico', power: 60 },
    { name: 'Choque Elétrico', type: 'electric', category: 'especial', power: 55 },
    { name: 'Trovoada', type: 'electric', category: 'especial', power: 90 },
    { name: 'Arrepio', type: 'electric', category: 'estatuto', power: 0 },
  ],
  grass: [
    { name: 'Chicote de Videira', type: 'grass', category: 'fisico', power: 55 },
    { name: 'Folha Navalha', type: 'grass', category: 'fisico', power: 65 },
    { name: 'Pólen Afrodisíaco', type: 'grass', category: 'estatuto', power: 0 },
    { name: 'Raízes', type: 'grass', category: 'estatuto', power: 0 },
  ],
  ice: [
    { name: 'Banho Frio', type: 'ice', category: 'especial', power: 55 },
    { name: 'Beijo Gelado', type: 'ice', category: 'especial', power: 65 },
    { name: 'Nevasca', type: 'ice', category: 'especial', power: 90 },
    { name: 'Arrepio de Frio', type: 'ice', category: 'estatuto', power: 0 },
  ],
  fighting: [
    { name: 'Placagem', type: 'fighting', category: 'fisico', power: 60 },
    { name: 'Soco a Sério', type: 'fighting', category: 'fisico', power: 75 },
    { name: 'Chave de Pernas', type: 'fighting', category: 'fisico', power: 90 },
    { name: 'Aquecimento', type: 'fighting', category: 'estatuto', power: 0 },
  ],
  poison: [
    { name: 'Mordidela', type: 'poison', category: 'fisico', power: 55 },
    { name: 'Beijo Venenoso', type: 'poison', category: 'especial', power: 65 },
    { name: 'Ferrão', type: 'poison', category: 'fisico', power: 75 },
    { name: 'Névoa Tóxica', type: 'poison', category: 'estatuto', power: 0 },
  ],
  ground: [
    { name: 'Bofetada de Terra', type: 'ground', category: 'fisico', power: 60 },
    { name: 'Enterrar', type: 'ground', category: 'fisico', power: 70 },
    { name: 'Terramoto', type: 'ground', category: 'fisico', power: 95 },
    { name: 'Areia nos Olhos', type: 'ground', category: 'estatuto', power: 0 },
  ],
  flying: [
    { name: 'Rasante', type: 'flying', category: 'fisico', power: 60 },
    { name: 'Asa de Aço', type: 'flying', category: 'fisico', power: 70 },
    { name: 'Voo Picado', type: 'flying', category: 'fisico', power: 85 },
    { name: 'Vendaval', type: 'flying', category: 'especial', power: 75 },
  ],
  psychic: [
    { name: 'Confusão Mental', type: 'psychic', category: 'especial', power: 55 },
    { name: 'Psico-onda', type: 'psychic', category: 'especial', power: 80 },
    { name: 'Olhar Matador', type: 'psychic', category: 'estatuto', power: 0 },
    { name: 'Hipnose', type: 'psychic', category: 'estatuto', power: 0 },
  ],
  bug: [
    { name: 'Picada', type: 'bug', category: 'fisico', power: 50 },
    { name: 'Investida Rasteira', type: 'bug', category: 'fisico', power: 60 },
    { name: 'Zumbido', type: 'bug', category: 'especial', power: 70 },
    { name: 'Teia', type: 'bug', category: 'estatuto', power: 0 },
  ],
  rock: [
    { name: 'Pedrada', type: 'rock', category: 'fisico', power: 60 },
    { name: 'Avalanche', type: 'rock', category: 'fisico', power: 75 },
    { name: 'Rocha Afiada', type: 'rock', category: 'fisico', power: 90 },
    { name: 'Muralha', type: 'rock', category: 'estatuto', power: 0 },
  ],
  ghost: [
    { name: 'Lambidela Fantasma', type: 'ghost', category: 'fisico', power: 50 },
    { name: 'Bola Sombria', type: 'ghost', category: 'especial', power: 75 },
    { name: 'Susto', type: 'ghost', category: 'estatuto', power: 0 },
    { name: 'Maldição', type: 'ghost', category: 'estatuto', power: 0 },
  ],
  dragon: [
    { name: 'Fúria do Dragão', type: 'dragon', category: 'especial', power: 60 },
    { name: 'Garra Dragão', type: 'dragon', category: 'fisico', power: 80 },
    { name: 'Sopro Dragão', type: 'dragon', category: 'especial', power: 90 },
    { name: 'Dança do Dragão', type: 'dragon', category: 'estatuto', power: 0 },
  ],
  dark: [
    { name: 'Mordida Nocturna', type: 'dark', category: 'fisico', power: 65 },
    { name: 'Golpe Baixo', type: 'dark', category: 'fisico', power: 75 },
    { name: 'Truque Sujo', type: 'dark', category: 'especial', power: 85 },
    { name: 'Provocação', type: 'dark', category: 'estatuto', power: 0 },
  ],
  steel: [
    { name: 'Garras de Metal', type: 'steel', category: 'fisico', power: 55 },
    { name: 'Bomba Magnética', type: 'steel', category: 'especial', power: 70 },
    { name: 'Cabeça de Ferro', type: 'steel', category: 'fisico', power: 85 },
    { name: 'Defesa de Ferro', type: 'steel', category: 'estatuto', power: 0 },
  ],
  fairy: [
    { name: 'Voz Encantada', type: 'fairy', category: 'especial', power: 55 },
    { name: 'Beijo Doce', type: 'fairy', category: 'especial', power: 65 },
    { name: 'Brilho Mágico', type: 'fairy', category: 'especial', power: 85 },
    { name: 'Olhar Meigo', type: 'fairy', category: 'estatuto', power: 0 },
  ],
}

/** Ataques-assinatura: certas características desbloqueiam um golpe especial,
 *  tal como uma habilidade única. As chaves batem certo com as sugestões em
 *  `data/traits.ts`. */
const TRAIT_MOVES: Record<string, Move> = {
  'Olhar matador': { name: 'Olhar Matador', type: 'psychic', category: 'estatuto', power: 0 },
  'Boquete de campeonato': { name: 'Boquete de Campeonato', type: 'water', category: 'especial', power: 100 },
  'Chupa como uma deusa': { name: 'Chupada Divina', type: 'water', category: 'especial', power: 90 },
  'Engole tudo': { name: 'Engole Tudo', type: 'water', category: 'especial', power: 80 },
  'Fogoso/a': { name: 'Fogo no Rabo', type: 'fire', category: 'especial', power: 80 },
  'Insaciável': { name: 'Sede Insaciável', type: 'dragon', category: 'especial', power: 85 },
  'Tarado/a': { name: 'Ataque de Tarado', type: 'dark', category: 'fisico', power: 80 },
  'Fode como um cavalo': { name: 'Galope Selvagem', type: 'fighting', category: 'fisico', power: 100 },
  'Bombeia bem': { name: 'Bombardeio', type: 'fighting', category: 'fisico', power: 85 },
  'Aguenta as horas': { name: 'Resistência Extrema', type: 'steel', category: 'estatuto', power: 0 },
  'Língua de cobra': { name: 'Língua de Cobra', type: 'poison', category: 'fisico', power: 75 },
  'Beijoqueiro/a': { name: 'Chuva de Beijos', type: 'fairy', category: 'especial', power: 60 },
  'Dominador/a': { name: 'Domínio Total', type: 'dark', category: 'estatuto', power: 0 },
  'Submisso/a': { name: 'Rendição', type: 'normal', category: 'estatuto', power: 0 },
  'Curte tapas': { name: 'Palmada Ardente', type: 'fighting', category: 'fisico', power: 65 },
  'Curte spanking': { name: 'Spanking', type: 'fighting', category: 'fisico', power: 70 },
  'Múltiplos orgasmos': { name: 'Combo Múltiplo', type: 'psychic', category: 'especial', power: 90 },
  'Rabo empinado': { name: 'Requebro', type: 'fairy', category: 'estatuto', power: 0 },
  'Rabo de melancia': { name: 'Rabada', type: 'fighting', category: 'fisico', power: 75 },
  'Sorriso safado': { name: 'Sorriso Safado', type: 'dark', category: 'estatuto', power: 0 },
  'Bruto/a': { name: 'Selvajaria', type: 'fighting', category: 'fisico', power: 90 },
  'Delicado/a': { name: 'Toque Delicado', type: 'fairy', category: 'estatuto', power: 0 },
  'Grita muito': { name: 'Grito Ensurdecedor', type: 'normal', category: 'especial', power: 70 },
  'Geme baixinho': { name: 'Gemido Hipnótico', type: 'psychic', category: 'estatuto', power: 0 },
  'Fala porcaria': { name: 'Boca Suja', type: 'dark', category: 'especial', power: 65 },
  'Curte estrangular': { name: 'Aperto Fatal', type: 'ghost', category: 'fisico', power: 85 },
  'Tóxico/a': { name: 'Relação Tóxica', type: 'poison', category: 'estatuto', power: 0 },
  'Red flag': { name: 'Bandeira Vermelha', type: 'fire', category: 'especial', power: 80 },
  'Green flag': { name: 'Bandeira Verde', type: 'grass', category: 'estatuto', power: 0 },
  'Rico/a': { name: 'Chuva de Dinheiro', type: 'steel', category: 'especial', power: 70 },
  'BDSM friendly': { name: 'Sessão BDSM', type: 'dark', category: 'fisico', power: 90 },
  'Exibicionista': { name: 'Show ao Vivo', type: 'normal', category: 'estatuto', power: 0 },
  'Voyeur': { name: 'Olho no Buraco', type: 'psychic', category: 'estatuto', power: 0 },
  'Trio-lover': { name: 'Ataque em Trio', type: 'psychic', category: 'especial', power: 85 },
  'Corpo escultural': { name: 'Pose Escultural', type: 'fairy', category: 'estatuto', power: 0 },
  'Bem dotado/a': { name: 'Golpe Dotado', type: 'dragon', category: 'fisico', power: 90 },
  'Pila grossa': { name: 'Marreta', type: 'fighting', category: 'fisico', power: 95 },
  'Buceta apertada': { name: 'Aperto Apertado', type: 'ghost', category: 'fisico', power: 80 },
  'Musculado/a': { name: 'Flexão de Músculos', type: 'fighting', category: 'estatuto', power: 0 },
  'Ruivo/a de fogo': { name: 'Chama Ruiva', type: 'fire', category: 'especial', power: 75 },
}

/* ------------------------------------------------------------------ */
/* Seleção determinística de ataques                                   */
/* ------------------------------------------------------------------ */

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** PRNG determinístico (mulberry32) — mesmo seed, mesma sequência. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Os 4 ataques da pessoa: até 2 assinaturas das características, o resto do
 *  movepool do(s) tipo(s), com prioridade ao tipo primário. Determinístico
 *  (estável entre recargas) mas único por pessoa. */
export function personMoves(person: Person): Move[] {
  const seed = hashSeed(person.id || `n${person.number}`)
  const rnd = mulberry32(seed)

  const chosen: Move[] = []
  const seen = new Set<string>()
  const add = (m: Move | undefined) => {
    if (m && chosen.length < 4 && !seen.has(m.name)) {
      seen.add(m.name)
      chosen.push(m)
    }
  }

  const traitMoves = person.traits
    .map((t) => TRAIT_MOVES[t])
    .filter((m): m is Move => Boolean(m))

  // 1. Até 2 ataques-assinatura das características.
  traitMoves.slice(0, 2).forEach(add)

  // 2. Preencher com o movepool do tipo (primário primeiro, depois secundário).
  const types = person.types.length ? person.types : ['normal']
  const primary = shuffle(TYPE_MOVEPOOLS[types[0]] ?? [], rnd)
  const secondary = types[1] ? shuffle(TYPE_MOVEPOOLS[types[1]] ?? [], rnd) : []
  ;[...primary, ...secondary].forEach(add)

  // 3. Restantes assinaturas, se ainda houver espaço.
  traitMoves.slice(2).forEach(add)

  // 4. Rede de segurança: ataques Normais.
  shuffle(TYPE_MOVEPOOLS.normal, rnd).forEach(add)

  return chosen.slice(0, 4)
}

/* ------------------------------------------------------------------ */
/* Vantagens de tipo (tabela de eficácia)                              */
/* ------------------------------------------------------------------ */

/** Multiplicadores tipo-atacante → tipo-defensor. Só se listam os valores
 *  diferentes de 1 (2 = super eficaz, 0.5 = pouco eficaz, 0 = sem efeito).
 *  Tabela padrão do Pokémon (Gen 6+). */
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

/** Multiplicador de um tipo de ataque contra um único tipo defensor. */
export function typeMultiplier(attackType: string, defenderType: string): number {
  return TYPE_CHART[attackType]?.[defenderType] ?? 1
}

/** Eficácia total contra um defensor de 1–2 tipos (produto dos multiplicadores). */
export function typeEffectiveness(attackType: string, defenderTypes: string[]): number {
  const defs = defenderTypes.length ? defenderTypes : ['normal']
  return defs.reduce((mult, d) => mult * typeMultiplier(attackType, d), 1)
}

/** Texto e tom para mostrar a eficácia de um golpe. */
export function effectivenessNote(mult: number): { text: string; tone: 'super' | 'weak' | 'none' | 'normal' } {
  if (mult === 0) return { text: 'Não teve efeito…', tone: 'none' }
  if (mult >= 2) return { text: 'Super eficaz!', tone: 'super' }
  if (mult < 1) return { text: 'Pouco eficaz…', tone: 'weak' }
  return { text: '', tone: 'normal' }
}

/* ------------------------------------------------------------------ */
/* Motor de batalha                                                    */
/* ------------------------------------------------------------------ */

export interface Fighter {
  id: string
  name: string
  types: string[]
  level: number
  maxHp: number
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
  moves: Move[]
  atkBuff: number // acumula com ataques de estatuto
}

/** Constrói um lutador a partir de uma pessoa: stats de batalha escalados pelo
 *  nível (mais momentos = mais forte) e os seus 4 ataques. */
export function buildFighter(person: Person): Fighter {
  const stats = personBattleStats(person)
  const raw: Record<BattleStatKey, number> = {
    hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0,
  }
  stats.forEach((s) => {
    raw[s.key] = s.value
  })
  const level = personLevelInfo(personXp(person)).level
  const m = 1 + (level - 1) * 0.06 // bónus de nível
  const lv = (v: number) => Math.round(v * m)
  const maxHp = Math.round(raw.hp * 4 * m)
  return {
    id: person.id,
    name: person.name,
    types: person.types.length ? person.types : ['normal'],
    level,
    maxHp,
    hp: maxHp,
    atk: lv(raw.atk),
    def: lv(raw.def),
    spa: lv(raw.spa),
    spd: lv(raw.spd),
    spe: lv(raw.spe),
    moves: personMoves(person),
    atkBuff: 1,
  }
}

export interface BattleTurn {
  attacker: 'a' | 'b'
  moveName: string
  moveType: string
  category: MoveCategory
  damage: number
  effectiveness: number
  note: string
  heal: number
  aHp: number
  bHp: number
  fainted: boolean
}

export interface BattleResult {
  a: Fighter // estado inicial (para maxHp / avatar)
  b: Fighter
  turns: BattleTurn[]
  winner: 'a' | 'b' | 'draw'
}

const MAX_TURNS = 60 // segurança contra combates infinitos

function damageOf(
  attacker: Fighter,
  defender: Fighter,
  move: Move,
  variance: number,
): { dmg: number; eff: number } {
  const eff = typeEffectiveness(move.type, defender.types)
  if (move.power <= 0 || eff === 0) return { dmg: 0, eff }
  const physical = move.category === 'fisico'
  const A = (physical ? attacker.atk : attacker.spa) * attacker.atkBuff
  const D = physical ? defender.def : defender.spd
  const stab = attacker.types.includes(move.type) ? 1.5 : 1
  const dmg = move.power * (A / Math.max(1, D)) * 0.9 * stab * eff * variance
  return { dmg: Math.max(1, Math.round(dmg)), eff }
}

/** A "IA": escolhe o ataque de estatuto para curar quando está em apuros,
 *  senão o golpe de maior dano esperado. */
function chooseMove(attacker: Fighter, defender: Fighter): Move {
  let best = attacker.moves[0]
  let bestScore = -1
  const lowHp = attacker.hp < attacker.maxHp * 0.45
  for (const move of attacker.moves) {
    let score: number
    if (move.category === 'estatuto') {
      const bestDmg = Math.max(
        1,
        ...attacker.moves.map((mv) => damageOf(attacker, defender, mv, 0.925).dmg),
      )
      score = lowHp ? bestDmg + 1 : bestDmg * 0.5
    } else {
      score = damageOf(attacker, defender, move, 0.925).dmg
    }
    if (score > bestScore) {
      bestScore = score
      best = move
    }
  }
  return best
}

/** Simula uma batalha completa e determinística entre duas pessoas.
 *  O resultado é sempre igual para o mesmo par (bom para rever). */
export function simulateBattle(personA: Person, personB: Person): BattleResult {
  const a = buildFighter(personA)
  const b = buildFighter(personB)
  const rnd = mulberry32(hashSeed(a.id + '|' + b.id))

  const turns: BattleTurn[] = []
  // Quem é mais rápido ataca primeiro (desempate pelo seed).
  let aTurn = a.spe > b.spe || (a.spe === b.spe && rnd() < 0.5)

  let guard = 0
  while (a.hp > 0 && b.hp > 0 && guard < MAX_TURNS) {
    guard++
    const attacker = aTurn ? a : b
    const defender = aTurn ? b : a
    const move = chooseMove(attacker, defender)

    let damage = 0
    let heal = 0
    let eff = 1
    let note = ''

    if (move.category === 'estatuto') {
      heal = Math.round(attacker.maxHp * 0.15)
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal)
      attacker.atkBuff = Math.min(1.6, attacker.atkBuff * 1.1)
      note = 'Preparou-se e recuperou'
    } else {
      const res = damageOf(attacker, defender, move, 0.85 + rnd() * 0.15)
      damage = res.dmg
      eff = res.eff
      defender.hp = Math.max(0, defender.hp - damage)
      note = effectivenessNote(eff).text
    }

    turns.push({
      attacker: aTurn ? 'a' : 'b',
      moveName: move.name,
      moveType: move.type,
      category: move.category,
      damage,
      effectiveness: eff,
      note,
      heal,
      aHp: a.hp,
      bHp: b.hp,
      fainted: defender.hp <= 0,
    })

    aTurn = !aTurn
  }

  let winner: 'a' | 'b' | 'draw'
  if (a.hp <= 0 && b.hp <= 0) winner = 'draw'
  else if (b.hp <= 0) winner = 'a'
  else if (a.hp <= 0) winner = 'b'
  // Bateu no limite de turnos: decide por percentagem de HP.
  else {
    const aPct = a.hp / a.maxHp
    const bPct = b.hp / b.maxHp
    winner = aPct === bPct ? 'draw' : aPct > bPct ? 'a' : 'b'
  }

  // Devolve os lutadores no estado inicial (HP cheio) para a UI.
  return {
    a: { ...a, hp: a.maxHp, atkBuff: 1 },
    b: { ...b, hp: b.maxHp, atkBuff: 1 },
    turns,
    winner,
  }
}
