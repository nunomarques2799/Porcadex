import worldData from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'

// The bundled topojson is our single source of truth for both the country
// picker and the world map, so a person's country id always matches a shape.

interface CountryProps {
  name: string
}

const fc = feature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worldData as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (worldData as any).objects.countries,
) as unknown as FeatureCollection<Geometry, CountryProps>

export type CountryFeature = Feature<Geometry, CountryProps>

export const COUNTRY_FEATURES: CountryFeature[] = fc.features

// Portuguese names for the countries most likely to come up; anything else
// falls back to the map's English name.
const PT_NAMES: Record<string, string> = {
  Portugal: 'Portugal',
  Spain: 'Espanha',
  France: 'França',
  Germany: 'Alemanha',
  Italy: 'Itália',
  'United Kingdom': 'Reino Unido',
  Ireland: 'Irlanda',
  Netherlands: 'Países Baixos',
  Belgium: 'Bélgica',
  Switzerland: 'Suíça',
  Austria: 'Áustria',
  Poland: 'Polónia',
  Sweden: 'Suécia',
  Norway: 'Noruega',
  Finland: 'Finlândia',
  Denmark: 'Dinamarca',
  Greece: 'Grécia',
  'Czechia': 'Chéquia',
  Croatia: 'Croácia',
  Hungary: 'Hungria',
  Romania: 'Roménia',
  Ukraine: 'Ucrânia',
  Russia: 'Rússia',
  Turkey: 'Turquia',
  Brazil: 'Brasil',
  'United States of America': 'Estados Unidos',
  Canada: 'Canadá',
  Mexico: 'México',
  Argentina: 'Argentina',
  Colombia: 'Colômbia',
  Chile: 'Chile',
  Morocco: 'Marrocos',
  'Cape Verde': 'Cabo Verde',
  Angola: 'Angola',
  Mozambique: 'Moçambique',
  'South Africa': 'África do Sul',
  Egypt: 'Egito',
  China: 'China',
  Japan: 'Japão',
  'South Korea': 'Coreia do Sul',
  India: 'Índia',
  Thailand: 'Tailândia',
  Australia: 'Austrália',
  'New Zealand': 'Nova Zelândia',
}

function displayName(englishName: string): string {
  return PT_NAMES[englishName] ?? englishName
}

export interface Country {
  id: string
  name: string
}

export const COUNTRIES: Country[] = COUNTRY_FEATURES.map((f) => ({
  id: String(f.id),
  name: displayName(f.properties.name),
}))
  .filter((c) => c.name && c.name !== 'Antarctica')
  .sort((a, b) => a.name.localeCompare(b.name, 'pt'))

const BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]))

export function countryName(id: string | undefined): string {
  if (!id) return ''
  return BY_ID.get(id)?.name ?? ''
}

export const DEFAULT_HOME_ID = '620' // Portugal
