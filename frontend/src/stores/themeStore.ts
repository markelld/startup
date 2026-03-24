import { create } from 'zustand'

type Theme = 'dark' | 'light'

const THEME_KEY = 'zone_theme'

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
}

const stored = (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
applyTheme(stored)

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: stored,
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
    set({ theme: next })
  },
}))
