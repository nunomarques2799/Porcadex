import { useMemo } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { FeatureCollection } from 'geojson'
import { COUNTRY_FEATURES } from '../data/countries'

const WIDTH = 380
const HEIGHT = 190

interface WorldMapProps {
  visited: Set<string>
  homeId?: string
  accent?: string
}

export function WorldMap({ visited, homeId, accent = '#EC5A96' }: WorldMapProps) {
  // Geometry is static, so compute the projected path for each country once.
  const shapes = useMemo(() => {
    const features = COUNTRY_FEATURES.filter(
      (f) => f.properties.name !== 'Antarctica',
    )
    const collection: FeatureCollection = {
      type: 'FeatureCollection',
      features: features as FeatureCollection['features'],
    }
    // d3-geo and geojson types don't line up perfectly; cast at the seam.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], collection as any)
    const path = geoPath(projection)
    return features.map((f) => ({
      id: String(f.id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      d: path(f as any) ?? '',
    }))
  }, [])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="worldmap"
      role="img"
      aria-label="Mapa dos países da tua coleção"
    >
      {shapes.map((s) => {
        const isHome = s.id === homeId
        const isVisited = visited.has(s.id)
        return (
          <path
            key={s.id}
            d={s.d}
            className="worldmap__country"
            style={
              isHome
                ? { fill: '#F5B23E' }
                : isVisited
                  ? { fill: accent }
                  : undefined
            }
          />
        )
      })}
    </svg>
  )
}
