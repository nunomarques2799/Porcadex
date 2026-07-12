// Pokémon-style elemental types. The primary type drives a person's card and
// header colours, just like a real Pokédex.

export interface PokeTypeDef {
  key: string
  label: string
  color: string
}

export const POKE_TYPES: PokeTypeDef[] = [
  { key: 'normal', label: 'Normal', color: '#A8A77A' },
  { key: 'fire', label: 'Fire', color: '#EE8130' },
  { key: 'water', label: 'Water', color: '#5C90F0' },
  { key: 'electric', label: 'Electric', color: '#F2C21C' },
  { key: 'grass', label: 'Grass', color: '#5FBB48' },
  { key: 'ice', label: 'Ice', color: '#74CEC0' },
  { key: 'fighting', label: 'Fighting', color: '#C22E28' },
  { key: 'poison', label: 'Poison', color: '#A33EA1' },
  { key: 'ground', label: 'Ground', color: '#DEB749' },
  { key: 'flying', label: 'Flying', color: '#A98FF3' },
  { key: 'psychic', label: 'Psychic', color: '#F95587' },
  { key: 'bug', label: 'Bug', color: '#A6B91A' },
  { key: 'rock', label: 'Rock', color: '#B6A136' },
  { key: 'ghost', label: 'Ghost', color: '#735797' },
  { key: 'dragon', label: 'Dragon', color: '#6F35FC' },
  { key: 'dark', label: 'Dark', color: '#6D5847' },
  { key: 'steel', label: 'Steel', color: '#8E8EA8' },
  { key: 'fairy', label: 'Fairy', color: '#EC8FE6' },
]

const FALLBACK: PokeTypeDef = { key: 'normal', label: 'Normal', color: '#A8A77A' }

export function getType(key: string | undefined): PokeTypeDef {
  return POKE_TYPES.find((t) => t.key === key) ?? FALLBACK
}

/** Colour theming derived from a person's primary type. */
export function typeTheme(primaryKey: string | undefined) {
  const accent = getType(primaryKey).color
  return {
    accent,
    // Light pastel for cards (kept light in dark mode too).
    bg: `color-mix(in srgb, ${accent} 16%, #ffffff)`,
    // Two-stop gradient for the detail header.
    gradient: `linear-gradient(150deg, ${accent}, color-mix(in srgb, ${accent} 62%, #000000))`,
  }
}
