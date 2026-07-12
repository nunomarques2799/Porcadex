import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'porcadex.theme'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Stored preference, or the system default if the user hasn't chosen. */
export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' || stored === 'dark' ? stored : systemTheme()
}

const THEME_COLOR: Record<Theme, string> = {
  light: '#f4f5f9',
  dark: '#14161d',
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  const toggle = () =>
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(KEY, next)
      return next
    })

  return { theme, toggle }
}
