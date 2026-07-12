import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Person } from '../types'
import { EMPTY_STATS } from '../types'
import { uid } from '../lib/utils'
import { deletePhoto } from '../lib/photoStore'
import { seedPeople } from '../data/seed'

const STORAGE_KEY = 'porcadex.people.v1'

interface PeopleContextValue {
  people: Person[]
  getPerson: (id: string) => Person | undefined
  addPerson: (draft: NewPerson) => Person
  updatePerson: (id: string, patch: Partial<Person>) => void
  deletePerson: (id: string) => void
  toggleFavorite: (id: string) => void
}

export type NewPerson = Omit<Person, 'id' | 'number' | 'createdAt'>

const PeopleContext = createContext<PeopleContextValue | null>(null)

function load(): Person[] {
  // Pure read (no writes) so it's safe under React StrictMode's double-invoke.
  // The presence of the key itself marks that the app has run before, so we
  // only seed examples when nothing has ever been stored.
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== null) {
    try {
      return JSON.parse(raw) as Person[]
    } catch {
      return []
    }
  }
  return seedPeople()
}

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(people))
    } catch {
      /* storage full — ignore */
    }
  }, [people])

  const value = useMemo<PeopleContextValue>(() => {
    const nextNumber = () =>
      people.reduce((max, p) => Math.max(max, p.number), 0) + 1

    return {
      people,
      getPerson: (id) => people.find((p) => p.id === id),
      addPerson: (draft) => {
        const person: Person = {
          ...draft,
          id: uid(),
          number: nextNumber(),
          createdAt: Date.now(),
        }
        setPeople((prev) => [...prev, person])
        return person
      },
      updatePerson: (id, patch) => {
        setPeople((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        )
      },
      deletePerson: (id) => {
        const person = people.find((p) => p.id === id)
        if (person) {
          // Clean up any stored photos.
          const ids = [
            ...(person.avatarId ? [person.avatarId] : []),
            ...person.photoIds,
          ]
          ids.forEach((pid) => void deletePhoto(pid))
        }
        setPeople((prev) => prev.filter((p) => p.id !== id))
      },
      toggleFavorite: (id) => {
        setPeople((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, favorite: !p.favorite } : p,
          ),
        )
      },
    }
  }, [people])

  return (
    <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>
  )
}

export function usePeople(): PeopleContextValue {
  const ctx = useContext(PeopleContext)
  if (!ctx) throw new Error('usePeople must be used within PeopleProvider')
  return ctx
}

/** Build a blank person draft ready for the add form. */
export function emptyDraft(): NewPerson {
  return {
    name: '',
    nickname: '',
    relationship: 'amigo',
    avatarId: undefined,
    photoIds: [],
    rating: 0,
    stats: { ...EMPTY_STATS },
    about: {},
    traits: [],
    notes: '',
    moments: [],
    favorite: false,
  }
}
