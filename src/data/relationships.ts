// Relationship "types" — the Porcadex equivalent of Pokémon elemental types.
// Each has a pastel background (for list cards), an accent colour (badges,
// numbers) and a two-stop gradient (for the detail header).

export interface RelationshipDef {
  key: string
  label: string
  accent: string
  gradient: [string, string]
  bg: string // pastel card background
}

export const RELATIONSHIPS: RelationshipDef[] = [
  {
    key: 'amigo',
    label: 'Amigo(a)',
    accent: '#2FAE82',
    gradient: ['#5AD6AE', '#37B98C'],
    bg: '#E3F7EF',
  },
  {
    key: 'melhor_amigo',
    label: 'Melhor Amigo(a)',
    accent: '#1FA6AF',
    gradient: ['#54D4DC', '#26AEB7'],
    bg: '#DEF5F6',
  },
  {
    key: 'familia',
    label: 'Família',
    accent: '#E0912A',
    gradient: ['#FBC15A', '#EE9E2E'],
    bg: '#FDF0D9',
  },
  {
    key: 'namorado',
    label: 'Namorado(a)',
    accent: '#E84C82',
    gradient: ['#FF7BA6', '#E84C82'],
    bg: '#FCE0EA',
  },
  {
    key: 'paixao',
    label: 'Paixão',
    accent: '#E9583B',
    gradient: ['#FF8566', '#E9583B'],
    bg: '#FCE5DE',
  },
  {
    key: 'colega',
    label: 'Colega',
    accent: '#4E86EB',
    gradient: ['#78A9FF', '#4E86EB'],
    bg: '#E4EDFD',
  },
  {
    key: 'conhecido',
    label: 'Conhecido(a)',
    accent: '#8A66E2',
    gradient: ['#B29BF2', '#8A66E2'],
    bg: '#EDE6FB',
  },
]

const FALLBACK: RelationshipDef = {
  key: 'outro',
  label: 'Outro',
  accent: '#7C8698',
  gradient: ['#A7B0C0', '#7C8698'],
  bg: '#ECEEF2',
}

export function getRelationship(key: string | undefined): RelationshipDef {
  return RELATIONSHIPS.find((r) => r.key === key) ?? FALLBACK
}
