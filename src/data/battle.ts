// Sistema de combate estilo Pokémon.
//
// Cada pessoa tem os seus PRÓPRIOS 6 stats de combate (guardados em
// person.battle.base) e um nível que sobe ganhando XP em batalhas contra
// pessoas de outros users. Ao subir de nível ganha pontos para reforçar um
// stat à escolha. Estes stats alimentam o dano dos moves.

import type { StatKey, Stats, BattleStats, BattleData } from '../types'

/* ------------------------------------------------------------------ */
/* Stats de batalha                                                    */
/* ------------------------------------------------------------------ */

export type BattleStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'

/** Metadados dos 6 stats de combate. `from` é o stat de personalidade usado
 *  APENAS para semear os stats iniciais de uma pessoa nova; depois disso os
 *  stats de combate são próprios e sobem por nível. */
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

/** Semeia os 6 stats de combate iniciais a partir da personalidade + tipo(s).
 *  Usado só à criação (ou para pessoas antigas ainda sem `battle`). A partir
 *  daí os stats são próprios e sobem por nível. */
export function deriveInitialBase(stats: Stats, types: string[]): BattleStats {
  const t = types.length ? types : ['normal']
  const out = {} as BattleStats
  for (const meta of BATTLE_STAT_META) {
    const base = stats[meta.from] ?? 50 // 0–100
    const mod =
      t.reduce((sum, ty) => sum + (TYPE_STAT_MODS[ty]?.[meta.key] ?? 0), 0) / t.length
    out[meta.key] = clamp(Math.round(35 + base * 0.85 + mod), 15, 170)
  }
  return out
}

/** Cria os dados de combate iniciais de uma pessoa (nível 1). */
export function initialBattleData(stats: Stats, types: string[]): BattleData {
  return { base: deriveInitialBase(stats, types), level: 1, xp: 0, points: 0, wins: 0, losses: 0 }
}

/** Normaliza o `battle` vindo da BD (semeia a partir da personalidade se
 *  faltar, e garante os 6 stats). Partilhado pelo store e pelas pessoas de
 *  amigos. */
export function normalizeBattle(raw: unknown, stats: Stats, types: string[]): BattleData {
  const r = (raw ?? {}) as Partial<BattleData>
  if (!r.base) return initialBattleData(stats, types)
  const seed = deriveInitialBase(stats, types)
  const base = { ...seed, ...r.base }
  return {
    base: { hp: base.hp, atk: base.atk, def: base.def, spa: base.spa, spd: base.spd, spe: base.spe },
    level: Number(r.level ?? 1) || 1,
    xp: Number(r.xp ?? 0) || 0,
    points: Number(r.points ?? 0) || 0,
    wins: Number(r.wins ?? 0) || 0,
    losses: Number(r.losses ?? 0) || 0,
  }
}

/** As 6 stats de combate guardadas da pessoa (para mostrar). */
export function personBattleStats(person: { battle: BattleData }): BattleStat[] {
  const b = person.battle.base
  return BATTLE_STAT_META.map((meta) => ({
    key: meta.key,
    label: meta.label,
    short: meta.short,
    value: b[meta.key],
  }))
}

/** Soma das 6 stats — o "Base Stat Total" da pessoa. */
export function battleStatTotal(stats: BattleStat[]): number {
  return stats.reduce((sum, s) => sum + s.value, 0)
}

/* ------------------------------------------------------------------ */
/* Progressão (XP / nível / pontos de stat)                            */
/* ------------------------------------------------------------------ */

/** 1 ponto de stat por nível; cada ponto reforça o stat em +5. */
export const STAT_POINTS_PER_LEVEL = 1
export const STAT_POINT_VALUE = 5

export interface BattleLevelInfo {
  level: number
  xp: number
  into: number
  span: number
  toNext: number
  progress: number // 0–1
}

/** Curva triangular de XP de combate — mais suave que o treinador para que as
 *  porcas subam bem a combater. L1:0, L2:30, L3:90… L100:148 500.
 *  Contra adversários do teu nível, ~130–150 vitórias chegam ao Nv100. */
function battleXpToReach(level: number): number {
  return Math.round(15 * (level - 1) * level)
}

export function battleLevelInfo(xp: number): BattleLevelInfo {
  let level = 1
  while (battleXpToReach(level + 1) <= xp) level++
  const base = battleXpToReach(level)
  const next = battleXpToReach(level + 1)
  return {
    level,
    xp,
    into: xp - base,
    span: next - base,
    toNext: next - xp,
    progress: (xp - base) / (next - base),
  }
}

/** XP (de combate, para a porca) ganho ao vencer uma pessoa de nível
 *  `loserLevel`. Generoso — é a via principal de progressão das porcas. */
export function xpForWin(loserLevel: number): number {
  return 60 + loserLevel * 20
}

export interface BattleReward {
  xpGain: number
  leveledTo: number | null // novo nível se subiu, senão null
  pointsGained: number
}

/** Aplica o resultado de uma batalha (só conta XP quando é cross-user).
 *  Devolve o novo BattleData e o resumo da recompensa. */
export function applyBattleResult(
  battle: BattleData,
  won: boolean,
  opponentLevel: number,
): { battle: BattleData; reward: BattleReward } {
  if (!won) {
    return {
      battle: { ...battle, losses: battle.losses + 1 },
      reward: { xpGain: 0, leveledTo: null, pointsGained: 0 },
    }
  }
  const xpGain = xpForWin(opponentLevel)
  const newXp = battle.xp + xpGain
  const oldLevel = battle.level
  const newLevel = battleLevelInfo(newXp).level
  const pointsGained = Math.max(0, newLevel - oldLevel) * STAT_POINTS_PER_LEVEL
  return {
    battle: {
      ...battle,
      xp: newXp,
      level: newLevel,
      points: battle.points + pointsGained,
      wins: battle.wins + 1,
    },
    reward: { xpGain, leveledTo: newLevel > oldLevel ? newLevel : null, pointsGained },
  }
}

/** Gasta 1 ponto para reforçar um stat em +STAT_POINT_VALUE. */
export function allocatePoint(battle: BattleData, key: BattleStatKey): BattleData {
  if (battle.points <= 0) return battle
  return {
    ...battle,
    base: { ...battle.base, [key]: battle.base[key] + STAT_POINT_VALUE },
    points: battle.points - 1,
  }
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

/** Um ataque por tipo — o golpe-assinatura do tipo. Cada porca tem 1 tipo, por
 *  isso é este o seu ataque de tipo; as características (traits) juntam extras. */
const TYPE_MOVEPOOLS: Record<string, Move> = {
  normal: { name: 'Cavalgada Descontrolada', type: 'normal', category: 'fisico', power: 95 },
  fire: { name: 'Rabo em Chamas', type: 'fire', category: 'fisico', power: 85 },
  water: { name: 'Tsunami de Leitinho', type: 'water', category: 'especial', power: 100 },
  electric: { name: 'Vibração Máxima', type: 'electric', category: 'especial', power: 90 },
  grass: { name: 'Selva Molhada', type: 'grass', category: 'especial', power: 90 },
  ice: { name: 'Cubos de Gelo Safados', type: 'ice', category: 'especial', power: 75 },
  fighting: { name: 'Chave de Pernas', type: 'fighting', category: 'fisico', power: 95 },
  poison: { name: 'Beijo Venenoso', type: 'poison', category: 'especial', power: 65 },
  ground: { name: 'Sentada Devastadora', type: 'ground', category: 'fisico', power: 75 },
  flying: { name: 'Rasante no Rabo', type: 'flying', category: 'fisico', power: 65 },
  psychic: { name: 'Controlo Mental Safado', type: 'psychic', category: 'especial', power: 90 },
  bug: { name: 'Zumbido no Clitóris', type: 'bug', category: 'especial', power: 70 },
  rock: { name: 'Tijolada Bruta', type: 'rock', category: 'fisico', power: 72 },
  ghost: { name: 'Invasão Traseira', type: 'ghost', category: 'fisico', power: 95 },
  dragon: { name: 'Fúria do Dragão', type: 'dragon', category: 'especial', power: 60 },
  dark: { name: 'Vale Tudo', type: 'dark', category: 'especial', power: 100 },
  steel: { name: 'Cabeçada Dura', type: 'steel', category: 'fisico', power: 82 },
  fairy: { name: 'Voz Manhosa', type: 'fairy', category: 'especial', power: 55 },
}

const TRAIT_MOVES: Record<string, Move> = {
  // --- Boca / línguas / broches ---
  'Olhar matador': { name: 'Olhar Devorador', type: 'psychic', category: 'estatuto', power: 0 },
  'Boquete de campeonato': { name: 'Boquete de Campeonato', type: 'water', category: 'especial', power: 100 },
  'Chupa como uma deusa': { name: 'Chupada Divina', type: 'water', category: 'especial', power: 95 },
  'Engole tudo': { name: 'Engole Tudo de Uma Vez', type: 'water', category: 'especial', power: 85 },
  'Língua de cobra': { name: 'Língua Safada', type: 'poison', category: 'fisico', power: 78 },
  'Boca de bombom': { name: 'Chupada Doce', type: 'fairy', category: 'especial', power: 80 },
  'Piercing na língua': { name: 'Língua com Piercing', type: 'steel', category: 'especial', power: 82 },
  'Fala porcaria': { name: 'Boca Suja', type: 'dark', category: 'especial', power: 72 },
  'Grita muito': { name: 'Grito de Gozo', type: 'normal', category: 'especial', power: 75 },
  'Geme baixinho': { name: 'Gemido Hipnótico', type: 'psychic', category: 'estatuto', power: 0 },

  // --- Fogo / tesão / intensidade ---
  'Fogoso/a': { name: 'Fogaréu Sacana', type: 'fire', category: 'especial', power: 85 },
  'Insaciável': { name: 'Sede Insaciável', type: 'dragon', category: 'especial', power: 90 },
  'Tarado/a': { name: 'Ataque de Tarado', type: 'dark', category: 'fisico', power: 85 },
  'Devasso/a': { name: 'Devassidão Total', type: 'dark', category: 'especial', power: 92 },
  'Sacana': { name: 'Sacanagem', type: 'dark', category: 'especial', power: 82 },
  'Porco/a': { name: 'Porcaria Total', type: 'poison', category: 'fisico', power: 88 },
  'Vem depressa': { name: 'Gozo Relâmpago', type: 'electric', category: 'especial', power: 65 },
  'Ficou molhadinha logo': { name: 'Molhadela Instantânea', type: 'water', category: 'especial', power: 72 },
  'Ficou duro num instante': { name: 'Ereção Imediata', type: 'fighting', category: 'fisico', power: 72 },
  'Ruivo/a de fogo': { name: 'Fogo Ruivo Safado', type: 'fire', category: 'especial', power: 78 },

  // --- Penetração / potência ---
  'Fode como um cavalo': { name: 'Galope Selvagem', type: 'fighting', category: 'fisico', power: 100 },
  'Bombeia bem': { name: 'Bombardeio Sem Parar', type: 'fighting', category: 'fisico', power: 90 },
  'Aguenta as horas': { name: 'Aguenta a Noite Toda', type: 'steel', category: 'estatuto', power: 0 },
  'Bem dotado/a': { name: 'Golpe Dotado', type: 'dragon', category: 'fisico', power: 95 },
  'Pila grossa': { name: 'Marretada Grossa', type: 'fighting', category: 'fisico', power: 100 },
  'Pila torta': { name: 'Golpe Torto', type: 'fighting', category: 'fisico', power: 72 },
  'Pilinha': { name: 'Espeta Fininho', type: 'normal', category: 'fisico', power: 40 },
  'Manda bem por cima': { name: 'Estocada por Cima', type: 'fighting', category: 'fisico', power: 88 },
  'Come com fome': { name: 'Faminto na Cama', type: 'dark', category: 'fisico', power: 82 },
  'Só para o pó': { name: 'Rapidinha', type: 'normal', category: 'fisico', power: 68 },

  // --- Rabo / ancas / traseiro ---
  'Rabo empinado': { name: 'Requebro do Rabo', type: 'fairy', category: 'estatuto', power: 0 },
  'Rabo de melancia': { name: 'Rabada', type: 'fighting', category: 'fisico', power: 80 },
  'Rabo respeitável': { name: 'Rabão Devastador', type: 'fighting', category: 'fisico', power: 85 },
  'Gosta de cavalgar': { name: 'Rodeio Selvagem', type: 'fighting', category: 'fisico', power: 88 },
  'Adora ser rabeada': { name: 'Rabeada', type: 'fighting', category: 'fisico', power: 90 },
  'Gosta pelo cu': { name: 'Invasão Traseira', type: 'ghost', category: 'fisico', power: 95 },
  'Curte anal': { name: 'Assalto Anal', type: 'ghost', category: 'fisico', power: 92 },
  'Cu apertado': { name: 'Aperto Traseiro', type: 'ghost', category: 'fisico', power: 82 },

  // --- Mamas / peito ---
  'Mamas fartas': { name: 'Peitorada', type: 'normal', category: 'fisico', power: 72 },
  'Mamocas': { name: 'Esmaga-Mamocas', type: 'normal', category: 'fisico', power: 85 },
  'Mamilos duros': { name: 'Mamilada Elétrica', type: 'electric', category: 'fisico', power: 68 },
  'Piercing no mamilo': { name: 'Mamilo de Aço', type: 'steel', category: 'fisico', power: 72 },

  // --- Xoxota ---
  'Xoxota depilada': { name: 'Escorrega Fácil', type: 'water', category: 'especial', power: 72 },
  'Xoxota peluda': { name: 'Buceta Cabeluda', type: 'grass', category: 'especial', power: 78 },
  'Buceta apertada': { name: 'Aperto Apertadinho', type: 'ghost', category: 'fisico', power: 85 },
  'Piercing na xoxota': { name: 'Aço Molhado', type: 'water', category: 'especial', power: 82 },

  // --- Corpo / aparência ---
  'Corpo escultural': { name: 'Pose Provocante', type: 'fairy', category: 'estatuto', power: 0 },
  'Coxas grossas': { name: 'Aperto de Coxas', type: 'fighting', category: 'fisico', power: 82 },
  'Musculado/a': { name: 'Flexão Provocante', type: 'fighting', category: 'estatuto', power: 0 },
  'Gigante': { name: 'Esmagamento Carnal', type: 'rock', category: 'fisico', power: 92 },
  'Baixinho/a': { name: 'Rasteira Safada', type: 'fighting', category: 'fisico', power: 60 },
  'Tatuado/a': { name: 'Marca de Chupão', type: 'dark', category: 'fisico', power: 68 },
  'Careca sensual': { name: 'Cabeçada Sedutora', type: 'steel', category: 'fisico', power: 72 },

  // --- Dominação / BDSM ---
  'Dominador/a': { name: 'Domínio Total', type: 'dark', category: 'estatuto', power: 0 },
  'Submisso/a': { name: 'Rendição Safada', type: 'normal', category: 'estatuto', power: 0 },
  'Curte tapas': { name: 'Palmada Ardente', type: 'fighting', category: 'fisico', power: 68 },
  'Curte spanking': { name: 'Spanking Brutal', type: 'fighting', category: 'fisico', power: 75 },
  'Adora ser puxado/a pelos cabelos': { name: 'Puxão de Cabelos', type: 'dark', category: 'fisico', power: 78 },
  'Curte estrangular': { name: 'Aperto no Pescoço', type: 'ghost', category: 'fisico', power: 88 },
  'BDSM friendly': { name: 'Sessão BDSM', type: 'dark', category: 'fisico', power: 92 },
  'Bruto/a': { name: 'Selvajaria na Cama', type: 'fighting', category: 'fisico', power: 92 },
  'Delicado/a': { name: 'Toque Provocante', type: 'fairy', category: 'estatuto', power: 0 },

  // --- Fetiches / cenários ---
  'Múltiplos orgasmos': { name: 'Combo de Orgasmos', type: 'psychic', category: 'especial', power: 92 },
  'Trio-lover': { name: 'Ataque em Trio', type: 'psychic', category: 'especial', power: 90 },
  'Exibicionista': { name: 'Show ao Vivo', type: 'normal', category: 'estatuto', power: 0 },
  'Voyeur': { name: 'Olho no Buraco', type: 'psychic', category: 'estatuto', power: 0 },
  'Fetiche por pés': { name: 'Chupada nos Dedinhos', type: 'poison', category: 'fisico', power: 65 },
  'Adora lingerie': { name: 'Desfile de Lingerie', type: 'fairy', category: 'estatuto', power: 0 },
  'Sem tabus': { name: 'Sem Limites na Cama', type: 'dark', category: 'especial', power: 95 },
  'Curte no chuveiro': { name: 'Queca no Duche', type: 'water', category: 'especial', power: 78 },
  'Curte ao ar livre': { name: 'Foda ao Ar Livre', type: 'grass', category: 'especial', power: 78 },
  'Curte no carro': { name: 'Queca no Carro', type: 'steel', category: 'fisico', power: 78 },
  'Beijoqueiro/a': { name: 'Chuva de Beijos', type: 'fairy', category: 'especial', power: 62 },
  'Sorriso safado': { name: 'Sorriso Safado', type: 'dark', category: 'estatuto', power: 0 },

  // --- Psicológicas / red flags ---
  'Tóxico/a': { name: 'Vício Safado', type: 'poison', category: 'estatuto', power: 0 },
  'Red flag': { name: 'Perigo Irresistível', type: 'fire', category: 'especial', power: 82 },
  'Green flag': { name: 'Tá Liberado', type: 'grass', category: 'estatuto', power: 0 },
  'Ciumento/a': { name: 'Ciúme Possessivo', type: 'dark', category: 'especial', power: 75 },
  'Possessivo/a': { name: 'Ciúme na Cama', type: 'dark', category: 'estatuto', power: 0 },
  'Manipulador/a': { name: 'Jogo de Sedução', type: 'psychic', category: 'estatuto', power: 0 },
  'Controlador/a': { name: 'Domínio na Cama', type: 'psychic', category: 'estatuto', power: 0 },
  'Drama queen': { name: 'Barraco na Cama', type: 'normal', category: 'especial', power: 72 },
  'Obsessivo/a': { name: 'Obsessão Carnal', type: 'ghost', category: 'estatuto', power: 0 },
  'Apaixonado/a': { name: 'Paixão Avassaladora', type: 'fairy', category: 'especial', power: 85 },
  'Carente': { name: 'Abraço Grudento', type: 'normal', category: 'estatuto', power: 0 },
  'Recaída garantida': { name: 'Recaída na Cama', type: 'psychic', category: 'estatuto', power: 0 },
  'Papi/Mami issues': { name: 'Chamada ao Papá', type: 'psychic', category: 'especial', power: 70 },

  // --- Vibes / estilo de vida ---
  'Rico/a': { name: 'Chuva de Notas no Strip', type: 'steel', category: 'especial', power: 72 },
  'Bebe demais': { name: 'Beijo com Bafo de Tequila', type: 'poison', category: 'especial', power: 62 },
  'Fuma erva': { name: 'Baforada Safada', type: 'grass', category: 'estatuto', power: 0 },
  'Sempre pedrado/a': { name: 'Moca e Tesão', type: 'psychic', category: 'estatuto', power: 0 },
  'Vagabundo/a': { name: 'Rodada Geral', type: 'normal', category: 'especial', power: 78 },
}

/* ------------------------------------------------------------------ */
/* Seleção determinística de ataques                                   */
/* ------------------------------------------------------------------ */

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

/** Dados mínimos para construir um lutador (serve Person e PublicPerson). */
export type FighterSource = {
  id: string
  number: number
  name: string
  types: string[]
  traits: string[]
  battle: BattleData
}

/** Ataques da pessoa: o ataque do seu tipo único mais as assinaturas das
 *  características (traits), até 4 no total. Determinístico e estável. */
export function personMoves(person: {
  id: string
  number: number
  traits: string[]
  types: string[]
}): Move[] {
  const chosen: Move[] = []
  const seen = new Set<string>()
  const add = (m: Move | undefined) => {
    if (m && chosen.length < 4 && !seen.has(m.name)) {
      seen.add(m.name)
      chosen.push(m)
    }
  }

  // 1. O ataque do tipo único da porca.
  const type = person.types[0] ?? 'normal'
  add(TYPE_MOVEPOOLS[type])

  // 2. Ataques-assinatura das características.
  person.traits.forEach((t) => add(TRAIT_MOVES[t]))

  // 3. Rede de segurança: garante pelo menos o ataque Normal.
  add(TYPE_MOVEPOOLS.normal)

  return chosen
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

/** Constrói um lutador a partir dos stats de combate guardados da pessoa. */
export function buildFighter(person: FighterSource): Fighter {
  const b = person.battle.base
  const maxHp = Math.round(b.hp * 4)
  return {
    id: person.id,
    name: person.name,
    types: person.types.length ? person.types : ['normal'],
    level: person.battle.level,
    maxHp,
    hp: maxHp,
    atk: b.atk,
    def: b.def,
    spa: b.spa,
    spd: b.spd,
    spe: b.spe,
    moves: personMoves(person),
    atkBuff: 1,
  }
}

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

/* ------------------------------------------------------------------ */
/* Equipas (1v1 até 6v6)                                               */
/* ------------------------------------------------------------------ */

/** Tamanho máximo de uma equipa — como no Pokémon. */
export const MAX_TEAM = 6

/** Uma equipa em combate: os lutadores e o índice de quem está em campo. */
export interface TeamState {
  fighters: Fighter[]
  active: number
}

export function buildTeam(sources: FighterSource[]): TeamState {
  return { fighters: sources.map(buildFighter), active: 0 }
}

export const activeOf = (t: TeamState): Fighter => t.fighters[t.active]
export const isAlive = (f: Fighter | undefined): boolean => !!f && f.hp > 0
export const teamAlive = (t: TeamState): boolean => t.fighters.some(isAlive)
export const teamFainted = (t: TeamState): number =>
  t.fighters.filter((f) => f.hp <= 0).length

/** Índices dos lutadores que ainda podem entrar (vivos e fora de campo). */
export function benchOptions(t: TeamState): number[] {
  return t.fighters
    .map((_, i) => i)
    .filter((i) => i !== t.active && isAlive(t.fighters[i]))
}

/** O que um lado faz num turno: atacar ou trocar de lutador. */
export type TurnAction =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; to: number }

/* ------------------------------------------------------------------ */
/* Combate interativo (por turnos)                                     */
/* ------------------------------------------------------------------ */

/** PP (usos) de um ataque — golpes mais fortes têm menos usos. */
export function moveMaxPp(move: Move): number {
  if (move.category === 'estatuto') return 20
  if (move.power <= 60) return 15
  if (move.power <= 85) return 10
  return 5
}

export interface MoveResult {
  category: MoveCategory
  damage: number
  heal: number
  effectiveness: number
  fainted: boolean
}

/** Aplica UM ataque (muta os lutadores). `variance` (0.85–1.0) permite modo
 *  determinístico (PvP) ou aleatório (vs IA). */
function applyMove(
  attacker: Fighter,
  defender: Fighter,
  move: Move,
  variance: number,
): MoveResult {
  if (move.category === 'estatuto') {
    const heal = Math.round(attacker.maxHp * 0.15)
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal)
    attacker.atkBuff = Math.min(1.6, attacker.atkBuff * 1.1)
    return { category: 'estatuto', damage: 0, heal, effectiveness: 1, fainted: false }
  }
  const { dmg, eff } = damageOf(attacker, defender, move, variance)
  defender.hp = Math.max(0, defender.hp - dmg)
  return { category: move.category, damage: dmg, heal: 0, effectiveness: eff, fainted: defender.hp <= 0 }
}

/** Aplica UM ataque ao vivo (variância aleatória). Usado no combate vs IA. */
export function resolveMove(attacker: Fighter, defender: Fighter, move: Move): MoveResult {
  return applyMove(attacker, defender, move, 0.85 + Math.random() * 0.15)
}

/** Escolha da IA para o adversário. */
export function aiChooseMove(attacker: Fighter, defender: Fighter): Move {
  return chooseMove(attacker, defender)
}

/** Qual o melhor lutador do banco para enfrentar o adversário atual: pesa o
 *  dano que dá, o que leva de volta, e o HP que ainda tem. */
function bestSwitch(team: TeamState, foe: TeamState): number {
  const bench = benchOptions(team)
  if (!bench.length) return team.active
  const target = activeOf(foe)
  let best = bench[0]
  let bestScore = -Infinity
  for (const i of bench) {
    const f = team.fighters[i]
    const out = Math.max(...f.moves.map((m) => damageOf(f, target, m, 0.925).dmg))
    const incoming = Math.max(...target.moves.map((m) => damageOf(target, f, m, 0.925).dmg))
    const score = out - incoming * 0.5 + f.hp * 0.1
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/** A ação da IA no turno: manda outro/a para o ringue se o atual caiu, senão
 *  ataca com o melhor golpe. */
export function aiChooseAction(team: TeamState, foe: TeamState): TurnAction {
  const active = activeOf(team)
  if (!isAlive(active)) return { kind: 'switch', to: bestSwitch(team, foe) }
  const mv = chooseMove(active, activeOf(foe))
  const index = active.moves.indexOf(mv)
  return { kind: 'move', index: index < 0 ? 0 : index }
}

/** Golpe de recurso quando ficam sem PP (tipo "Struggle"). */
export const STRUGGLE: Move = {
  name: 'Luta',
  type: 'normal',
  category: 'fisico',
  power: 40,
}

/* ------------------------------------------------------------------ */
/* PvP determinístico (batalha sincronizada entre 2 users)             */
/* ------------------------------------------------------------------ */

/** Estado imutável de um lutador, guardado no `setup` da batalha (freeze dos
 *  stats no início). Reconstruído em Fighter para o replay. */
export type FighterSnapshot = Omit<Fighter, 'hp' | 'atkBuff'>

export function fighterSnapshot(source: FighterSource): FighterSnapshot {
  const f = buildFighter(source)
  return {
    id: f.id,
    name: f.name,
    types: f.types,
    level: f.level,
    maxHp: f.maxHp,
    atk: f.atk,
    def: f.def,
    spa: f.spa,
    spd: f.spd,
    spe: f.spe,
    moves: f.moves,
  }
}

export const teamSnapshot = (sources: FighterSource[]): FighterSnapshot[] =>
  sources.map(fighterSnapshot)

/** As duas equipas congeladas no arranque da batalha. */
export interface TeamSetup {
  a: FighterSnapshot[]
  b: FighterSnapshot[]
}

/** Um turno PvP concluído: a ação escolhida por cada lado. */
export interface PvpTurn {
  a: TurnAction
  b: TurnAction
}

export interface PvpLogEntry {
  turn: number
  who: 'a' | 'b'
  kind: 'move' | 'switch'
  /** Quem agiu — com equipas já não se pode assumir o lutador pelo lado. */
  actor: string
  moveName?: string
  moveType?: string
  category?: MoveCategory
  damage: number
  heal: number
  effectiveness: number
  aHp: number
  bHp: number
  fainted: boolean
}

export interface PvpState {
  a: TeamState
  b: TeamState
  log: PvpLogEntry[]
  finished: boolean
  winner: 'a' | 'b' | null
}

/** Aceita o formato antigo (um só lutador, pré-equipas) e o novo (array), para
 *  que batalhas gravadas antes desta mudança continuem a abrir. */
export function normalizeTeamSetup(raw: unknown): FighterSnapshot[] {
  if (Array.isArray(raw)) return raw as FighterSnapshot[]
  if (raw && typeof raw === 'object') return [raw as FighterSnapshot]
  return []
}

/** Idem para as ações: antes era só o índice do ataque. */
export function normalizeAction(raw: unknown): TurnAction {
  if (typeof raw === 'number') return { kind: 'move', index: raw }
  const r = (raw ?? {}) as { kind?: string; index?: number; to?: number }
  if (r.kind === 'switch') return { kind: 'switch', to: Number(r.to ?? 0) }
  return { kind: 'move', index: Number(r.index ?? 0) }
}

function snapshotsToTeam(snaps: FighterSnapshot[]): TeamState {
  return {
    fighters: snaps.map((s) => ({ ...s, hp: s.maxHp, atkBuff: 1 })),
    active: 0,
  }
}

/** Reconstrói o estado atual da batalha a partir do setup + lista de turnos
 *  concluídos. DETERMINÍSTICO: ambos os clientes obtêm exatamente o mesmo
 *  resultado (mesmo seed → mesma variância).
 *
 *  Ordem de um turno, como no Pokémon: as trocas resolvem-se primeiro (quem
 *  troca abdica do ataque desse turno), e só depois os ataques, por velocidade
 *  do lutador que ficou em campo. */
export function replayPvp(setup: TeamSetup, seed: number, turns: PvpTurn[]): PvpState {
  const a = snapshotsToTeam(setup.a)
  const b = snapshotsToTeam(setup.b)
  const log: PvpLogEntry[] = []
  let winner: 'a' | 'b' | null = null

  const hpOf = () => ({
    aHp: activeOf(a)?.hp ?? 0,
    bHp: activeOf(b)?.hp ?? 0,
  })

  for (let ti = 0; ti < turns.length && !winner; ti++) {
    const rng = mulberry32((seed >>> 0) + ti * 2654435761)
    const acts: Record<'a' | 'b', TurnAction> = {
      a: normalizeAction(turns[ti].a),
      b: normalizeAction(turns[ti].b),
    }

    // 1) Trocas — sempre 'a' antes de 'b' para não depender da velocidade.
    for (const who of ['a', 'b'] as const) {
      const act = acts[who]
      if (act.kind !== 'switch') continue
      const team = who === 'a' ? a : b
      if (act.to === team.active || !isAlive(team.fighters[act.to])) continue
      team.active = act.to
      log.push({
        turn: ti,
        who,
        kind: 'switch',
        actor: activeOf(team).name,
        damage: 0,
        heal: 0,
        effectiveness: 1,
        fainted: false,
        ...hpOf(),
      })
    }

    // 1b) Rede de segurança: um lado com o lutador em campo caído mas ainda
    // com banco TEM de mandar alguém. A UI força a troca, mas o replay não
    // pode depender disso — sem isto, um cliente que enviasse um ataque em vez
    // da troca deixava o combate empancado para sempre (ninguém pode atacar um
    // lutador já caído).
    for (const who of ['a', 'b'] as const) {
      const team = who === 'a' ? a : b
      if (isAlive(activeOf(team))) continue
      const bench = benchOptions(team)
      if (!bench.length) continue
      team.active = bench[0]
      log.push({
        turn: ti,
        who,
        kind: 'switch',
        actor: activeOf(team).name,
        damage: 0,
        heal: 0,
        effectiveness: 1,
        fainted: false,
        ...hpOf(),
      })
    }

    // 2) Ataques, por velocidade de quem está em campo.
    const fa = activeOf(a)
    const fb = activeOf(b)
    const aFirst = fa.spe > fb.spe || (fa.spe === fb.spe && rng() < 0.5)
    const order: ('a' | 'b')[] = aFirst ? ['a', 'b'] : ['b', 'a']

    for (const who of order) {
      const act = acts[who]
      if (act.kind !== 'move') continue
      const atkTeam = who === 'a' ? a : b
      const defTeam = who === 'a' ? b : a
      const atk = activeOf(atkTeam)
      const def = activeOf(defTeam)
      // Um lutador caído não ataca; o lado tem de trocar num turno seguinte.
      if (!isAlive(atk) || !isAlive(def)) continue
      const mv = atk.moves[act.index] ?? STRUGGLE
      const res = applyMove(atk, def, mv, 0.85 + rng() * 0.15)
      log.push({
        turn: ti,
        who,
        kind: 'move',
        actor: atk.name,
        moveName: mv.name,
        moveType: mv.type,
        category: res.category,
        damage: res.damage,
        heal: res.heal,
        effectiveness: res.effectiveness,
        fainted: res.fainted,
        ...hpOf(),
      })
      if (!teamAlive(defTeam)) {
        winner = who
        break
      }
    }
  }

  return { a, b, log, finished: !!winner, winner }
}
