import { useEffect, useState } from 'react'
import { DEFAULT_HOME_ID } from '../data/countries'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Cached in localStorage as a fallback for the first render before Supabase
// answers, so the flag on the world map doesn't jump.
const CACHE_KEY = 'porcadex.home'

export function getHomeCountry(): string {
  return localStorage.getItem(CACHE_KEY) || DEFAULT_HOME_ID
}

export function useHomeCountry(): [string, (id: string) => void] {
  const { user } = useAuth()
  const [home, setHome] = useState<string>(getHomeCountry)

  useEffect(() => {
    if (!supabase || !user) return
    let active = true
    supabase
      .from('profiles')
      .select('home_country')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const raw = (data as { home_country?: string } | null)?.home_country
        if (raw) {
          setHome(raw)
          localStorage.setItem(CACHE_KEY, raw)
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const update = (id: string) => {
    setHome(id)
    localStorage.setItem(CACHE_KEY, id)
    if (!supabase || !user) return
    void supabase
      .from('profiles')
      .upsert({ id: user.id, home_country: id })
      .then(() => undefined)
  }

  return [home, update]
}
