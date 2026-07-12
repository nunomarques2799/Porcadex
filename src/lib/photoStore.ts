// Tiny IndexedDB wrapper for storing photos as data URLs, keyed by id.
// Photos can be large, so we keep them out of localStorage (which caps ~5MB)
// and store only their ids on each Person.

const DB_NAME = 'porcadex'
const STORE = 'photos'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb()
  return db.transaction(STORE, mode).objectStore(STORE)
}

function toPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  const store = await tx('readwrite')
  await toPromise(store.put(dataUrl, id))
}

export async function getPhoto(id: string): Promise<string | undefined> {
  const store = await tx('readonly')
  return toPromise(store.get(id) as IDBRequest<string | undefined>)
}

export async function deletePhoto(id: string): Promise<void> {
  const store = await tx('readwrite')
  await toPromise(store.delete(id))
}
