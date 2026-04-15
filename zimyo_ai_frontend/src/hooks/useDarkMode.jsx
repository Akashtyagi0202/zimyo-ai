import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'

const STORAGE_KEY = 'zimyo_theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch (_) { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const DarkModeContext = createContext({
  theme: 'light',
  isDark: false,
  toggle: () => {},
  setTheme: () => {},
})

export function DarkModeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useLayoutEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // Follow system preference changes unless the user has explicitly toggled.
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) return
      } catch (_) { /* ignore */ }
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  const toggle = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try { window.localStorage.setItem(STORAGE_KEY, next) } catch (_) { /* ignore */ }
      return next
    })
  }

  const setExplicit = (next) => {
    setTheme(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch (_) { /* ignore */ }
  }

  return (
    <DarkModeContext.Provider value={{ theme, isDark: theme === 'dark', toggle, setTheme: setExplicit }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export default function useDarkMode() {
  return useContext(DarkModeContext)
}
