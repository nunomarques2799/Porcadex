// A person's relationship is now one of two: a kiss ("Beijo") or something
// more ("Sexo"). Colour/theming comes from the Pokémon type, not from here —
// these just drive a small badge.

export interface RelationshipDef {
  key: string
  label: string
  color: string
  icon: 'kiss' | 'flame'
}

export const RELATIONSHIPS: RelationshipDef[] = [
  { key: 'beijo', label: 'Beijo', color: '#EC5A96', icon: 'kiss' },
  { key: 'sexo', label: 'Sexo', color: '#E23B4E', icon: 'flame' },
]

const FALLBACK: RelationshipDef = {
  key: 'beijo',
  label: 'Beijo',
  color: '#EC5A96',
  icon: 'kiss',
}

export function getRelationship(key: string | undefined): RelationshipDef {
  return RELATIONSHIPS.find((r) => r.key === key) ?? FALLBACK
}
