// Photo storage: uploads/downloads via Supabase Storage, keyed by an id.
// Photos live at `<userId>/<id>.jpg` inside the private "photos" bucket.
// Everything is gated by RLS so callers can only see their own files.

import { supabase, PHOTO_BUCKET } from './supabase'

/** Session-lifetime cache of id → blob URL so re-renders don't re-download. */
const urlCache = new Map<string, string>()

function currentUserId(): string | null {
  // The client stores the session in localStorage; grab the user id if any.
  // We fall back to null (caller then no-ops rather than throws).
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      const uid = parsed?.user?.id
      if (typeof uid === 'string') return uid
    }
  } catch {
    /* ignore */
  }
  return null
}

function pathFor(id: string, userId?: string | null): string | null {
  const uid = userId ?? currentUserId()
  if (!uid) return null
  return `${uid}/${id}.jpg`
}

/** Convert a data URL to a Blob for upload. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  if (!supabase) return
  const path = pathFor(id)
  if (!path) return
  const blob = dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: true })
  if (error) throw error
  // Prime the cache with a blob URL so the UI can show it immediately.
  const cached = urlCache.get(id)
  if (cached) URL.revokeObjectURL(cached)
  urlCache.set(id, URL.createObjectURL(blob))
}

export async function getPhoto(id: string): Promise<string | undefined> {
  if (!supabase) return undefined
  const cached = urlCache.get(id)
  if (cached) return cached
  const path = pathFor(id)
  if (!path) return undefined
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path)
  if (error || !data) return undefined
  const url = URL.createObjectURL(data)
  urlCache.set(id, url)
  return url
}

export async function deletePhoto(id: string): Promise<void> {
  if (!supabase) return
  const path = pathFor(id)
  if (!path) return
  await supabase.storage.from(PHOTO_BUCKET).remove([path])
  const cached = urlCache.get(id)
  if (cached) {
    URL.revokeObjectURL(cached)
    urlCache.delete(id)
  }
}
