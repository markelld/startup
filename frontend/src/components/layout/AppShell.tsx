import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useAccountStore } from '../../stores/accountStore'
import { useThemeStore } from '../../stores/themeStore'
import { useMutation, useApolloClient } from '@apollo/client'
import { SIGN_OUT, DELETE_ACCOUNT } from '../../lib/graphql/mutations'
import { LIST_ACCOUNTS } from '../../lib/graphql/queries'
import EditAccountModal from '../EditAccountModal'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { path: '/journal',   label: 'Journal',   icon: '📸' },
  { path: '/grade',     label: 'Grade',     icon: '📊' },
  { path: '/plan',      label: 'My Plan',   icon: '📋' },
  { path: '/reports',   label: 'Reports',   icon: '🤖' },
  { path: '/share',     label: 'Share',     icon: '🔗' },
  { path: '/settings',  label: 'Settings',  icon: '⚙️' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user, clearAuth } = useAuthStore()
  const { account, setAccount, clearAccount } = useAccountStore()
  const { theme, toggle } = useThemeStore()
  const apolloClient = useApolloClient()
  const [signOut] = useMutation(SIGN_OUT)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [allAccounts, setAllAccounts] = useState<any[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<any | null>(null)

  const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      if (data.deleteAccount.success) {
        setAllAccounts(prev => {
          const remaining = prev.filter(a => a.id !== confirmDeleteId)
          if (account?.id === confirmDeleteId) {
            const next = remaining[0] ?? null
            setAccount(next ?? ({} as any))
          }
          return remaining
        })
      }
      setConfirmDeleteId(null)
    },
  })

  useEffect(() => {
    apolloClient.query({ query: LIST_ACCOUNTS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const accounts = data?.accounts || []
        if (accounts.length > 0) setAllAccounts(accounts)
      }).catch(() => {})
  }, [apolloClient])

  const handleSignOut = async () => {
    try { await signOut() } catch {}
    clearAuth()
    clearAccount()
  }

  const switchAccount = (a: any) => {
    setAccount(a)
    setShowUserMenu(false)
  }

  return (
    <div className="flex min-h-screen bg-surface-900">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 bg-surface-100 border-r border-border flex-col shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green rounded-lg flex items-center justify-center font-bold text-surface-900 text-sm">
              Z
            </div>
            <span className="font-semibold text-white">Zone</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.path
                  ? 'bg-green/10 text-green border border-green/20'
                  : 'text-gray-400 hover:text-white hover:bg-surface-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer — mode toggle + sign out */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-50 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red/10 text-xs text-gray-400 hover:text-red transition-colors"
          >
            <span>→</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>

      {/* Top nav — mobile only */}
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-surface-100 border-b border-border flex z-40">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs transition-colors ${
              pathname === item.path ? 'text-green' : 'text-gray-500'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}

        {/* User menu trigger */}
        <div className="relative flex-1 flex flex-col items-center justify-center py-2.5">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex flex-col items-center gap-0.5 text-xs text-gray-500"
          >
            <span className="text-base leading-none">👤</span>
            <span className="text-[10px]">Account</span>
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-surface-100 border border-border rounded-xl shadow-xl z-50 py-1">
              <div className="px-3 py-2 text-xs text-gray-400 truncate border-b border-border">{user?.email}</div>

              {/* Account switcher */}
              {allAccounts.length > 0 && (
                <div className="border-b border-border py-1">
                  {allAccounts.map((a: any) => (
                    <div key={a.id} className={`flex items-center gap-1 px-2 ${confirmDeleteId === a.id ? 'bg-red/5' : ''}`}>
                      {confirmDeleteId === a.id ? (
                        <div className="flex items-center gap-2 py-2 w-full">
                          <span className="text-xs text-red flex-1">Delete all trades too?</span>
                          <button onClick={() => deleteAccount({ variables: { id: a.id } })} className="text-xs px-2 py-1 bg-red/20 text-red rounded hover:bg-red/30">Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 bg-surface-200 text-gray-400 rounded hover:bg-surface-50">No</button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => switchAccount(a)}
                            className={`flex-1 text-left py-2 text-sm transition-colors ${a.id === account?.id ? 'text-green' : 'text-gray-300'}`}
                          >
                            {a.firmName || a.name}{a.firmName && a.name ? ` · ${a.name}` : ''}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingAccount(a) }}
                            className="p-1 text-gray-600 hover:text-white transition-colors rounded"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(a.id) }}
                            className="p-1 text-gray-600 hover:text-red transition-colors rounded"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { toggle(); setShowUserMenu(false) }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-surface-50 transition-colors flex items-center gap-2"
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 text-sm text-red hover:bg-surface-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={(updated) => {
            setAllAccounts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
            if (account?.id === updated.id) setAccount({ ...account, ...updated })
            setEditingAccount(null)
          }}
        />
      )}
    </div>
  )
}
