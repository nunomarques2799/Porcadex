import { useEffect, useState } from 'react'
import { DEFAULT_HOME_ID } from '../data/countries'

const KEY = 'porcadex.home'

export function getHomeCountry(): string {
  return localStorage.getItem(KEY) || DEFAULT_HOME_ID
}

export function useHomeCountry(): [string, (id: string) => void] {
  const [home, setHome] = useState<string>(getHomeCountry)
  useEffect(() => {
    localStorage.setItem(KEY, home)
  }, [home])
  return [home, setHome]
}
