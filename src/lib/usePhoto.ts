import { useEffect, useState } from 'react'
import { getPhoto } from './photoStore'

// In-memory cache so re-renders and re-visits don't re-hit IndexedDB.
const cache = new Map<string, string>()

/** Resolve a stored photo id to its data URL (or undefined while loading). */
export function usePhoto(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    id ? cache.get(id) : undefined,
  )

  useEffect(() => {
    let active = true
    if (!id) {
      setUrl(undefined)
      return
    }
    const cached = cache.get(id)
    if (cached) {
      setUrl(cached)
      return
    }
    getPhoto(id).then((data) => {
      if (!active) return
      if (data) {
        cache.set(id, data)
        setUrl(data)
      }
    })
    return () => {
      active = false
    }
  }, [id])

  return url
}
