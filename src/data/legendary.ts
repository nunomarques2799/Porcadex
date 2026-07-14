// "Legendary" people — a rare, special classification, with sub-categories.

export interface LegendaryCatDef {
  key: string
  label: string
}

export const LEGENDARY_CATS: LegendaryCatDef[] = [
  { key: 'anao', label: 'Anão' },
  { key: 'ladyboy', label: 'Lady Boy' },
  { key: 'black', label: 'Black' },
  { key: 'ginger', label: 'Ginger' },
  { key: 'fatty', label: 'Fatty' },
  { key: 'milf', label: 'Milf' },
  { key: 'dilf', label: 'Dilf' },
  { key: 'virgem', label: 'Virgem' },
  { key: 'nao-binario', label: 'Não Binário' },
  { key: 'lesbica', label: 'Lésbica' },
  { key: 'bissexual', label: 'Bissexual' },
]

export function legendaryLabel(key: string): string {
  return LEGENDARY_CATS.find((c) => c.key === key)?.label ?? key
}
