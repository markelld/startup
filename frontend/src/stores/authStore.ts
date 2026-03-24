import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const TOKEN_KEY = 'zone_token'

// One-time migration: carry over old apex_token key
;(function migrateToken() {
  const old = localStorage.getItem('apex_token')
  const oldAuth = localStorage.getItem('apex-auth')
  if (old && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, old)
    localStorage.removeItem('apex_token')
  }
  if (oldAuth && !localStorage.getItem('zone-auth')) {
    localStorage.setItem('zone-auth', oldAuth.replace(/apex_token/g, 'zone_token'))
    localStorage.removeItem('apex-auth')
  }
})()

interface User {
  id: string
  email: string
  displayName?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        localStorage.setItem(TOKEN_KEY, token)
        set({ token, user, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem(TOKEN_KEY)
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'zone-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
