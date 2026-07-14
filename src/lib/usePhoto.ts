import { useEffect, useState } from 'react'
import { getPhoto, getPhotoForOwner } from './photoStore'

// In-memory cache so re-renders and re-visits don't re-hit IndexedDB.
const cache = new Map<string, string>()

/** Resolve a stored photo id to its data URL (or undefined while loading).
 *  If `ownerId` is provided, downloads from that user's folder (used for
 *  friends). Otherwise falls back to the current user's folder. */
export function usePhoto(
  id: string | undefined,
  ownerId?: string,
): string | undefined {
  const cacheKey = id ? (ownerId ? `${ownerId}/${id}` : id) : undefined
  const [url, setUrl] = useState<string | undefined>(() =>
    cacheKey ? cache.get(cacheKey) : undefined,
  )

  useEffect(() => {
    let active = true
    if (!id || !cacheKey) {
      setUrl(undefined)
      return
    }
    const cached = cache.get(cacheKey)
    if (cached) {
      setUrl(cached)
      return
    }
    const p = ownerId ? getPhotoForOwner(ownerId, id) : getPhoto(id)
    p.then((data) => {
      if (!active) return
      if (data) {
        cache.set(cacheKey, data)
        setUrl(data)
      }
    })
    return () => {
      active = false
    }
  }, [id, ownerId, cacheKey])

  return url
}
