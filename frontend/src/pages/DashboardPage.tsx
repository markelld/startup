import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useApolloClient } from '@apollo/client'
import { useAccountStore } from '../stores/accountStore'
import { CURRENT_ACCOUNT, LIST_ACCOUNTS } from '../lib/graphql/queries'
import { DELETE_ACCOUNT } from '../lib/graphql/mutations'
import StatCard from '../components/ui/StatCard'
import TradeTimeline from '../components/dashboard/TradeTimeline'
// import DisciplineRing from '../components/dashboard/DisciplineRing'
import AICoachPanel from '../components/dashboard/AICoachPanel'
// import BehavioralFlags from '../components/dashboard/BehavioralFlags'
import ExecutionBars from '../components/dashboard/ExecutionBars'
// import MarketChart from '../components/dashboard/MarketChart'
import ImportAccountModal from '../components/ImportAccountModal'
import EditAccountModal from '../components/EditAccountModal'

export default function DashboardPage() {
  const { account, setAccount } = useAccountStore()
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showImportModal, setShowImportModal] = useState<'new' | 'existing' | null>(null)
  const [editingAccount, setEditingAccount] = useState<any | null>(null)
  const apolloClient = useApolloClient()

  const [acc, setAcc] = useState<any>(account)
  const [allAccounts, setAllAccounts] = useState<any[]>([])
  // Track whether user has explicitly selected an account this session
  const userSelectedRef = useRef(false)

  // Load the accounts list once — never resets allAccounts to empty on failure
  useEffect(() => {
    apolloClient.query({ query: LIST_ACCOUNTS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const accounts: any[] = data?.accounts || []
        if (accounts.length > 0) setAllAccounts(accounts)
      })
      .catch(() => {})
  }, [apolloClient])

  // Load full stats for the selected account whenever it changes
  useEffect(() => {
    apolloClient.query({ query: CURRENT_ACCOUNT, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const current = data?.currentAccount
        if (current) {
          setAcc(current)
          // Only persist to store if user hasn't manually switched in this render
          if (!userSelectedRef.current) setAccount(current)
        }
      })
      .catch(() => {})
  // Re-run when acc.id changes (i.e. after an explicit switch) — acc.id is stable primitive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acc?.id, apolloClient])


  const switchAccount = useCallback((a: any) => {
    userSelectedRef.current = true
    setAccount(a)
    setAcc(a)
    setShowAccountMenu(false)
  }, [setAccount])

  const refetchStats = useCallback(async () => {
    const { data } = await apolloClient.query({ query: CURRENT_ACCOUNT, fetchPolicy: 'network-only' })
    const current = data?.currentAccount
    if (current) setAcc(current)
  }, [apolloClient])

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      if (data.deleteAccount.success) {
        const remaining = allAccounts.filter(a => a.id !== confirmDeleteId)
        setAllAccounts(remaining)
        if (acc?.id === confirmDeleteId) {
          const next = remaining[0] ?? null
          setAcc(next)
          if (next) setAccount(next); else setAccount(null as any)
        }
      }
      setConfirmDeleteId(null)
    },
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-semibold text-white truncate">
            Account Overview
          </h1>
          <div className="relative mt-1">
            <button
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span>{acc?.firmName || acc?.name || 'No account connected'}</span>
              {allAccounts.length > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              )}
            </button>
            {showAccountMenu && allAccounts.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface-100 border border-border rounded-lg shadow-xl z-20 py-1">
                {allAccounts.map((a: any) => (
                  <div key={a.id} className={`flex items-center gap-1 px-2 ${confirmDeleteId === a.id ? 'bg-red/5' : ''}`}>
                    {confirmDeleteId === a.id ? (
                      <div className="flex items-center gap-2 py-2 w-full">
                        <span className="text-xs text-red flex-1">Delete all trades too?</span>
                        <button
                          onClick={() => deleteAccount({ variables: { id: a.id } })}
                          className="text-xs px-2 py-1 bg-red/20 text-red rounded hover:bg-red/30 transition-colors"
                        >Yes</button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 bg-surface-200 text-gray-400 rounded hover:bg-surface-50 transition-colors"
                        >No</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => switchAccount(a)}
                          className={`flex-1 text-left py-2.5 text-sm transition-colors ${
                            a.id === acc?.id ? 'text-green' : 'text-gray-300'
                          }`}
                        >
                          {a.firmName || a.name}{a.firmName && a.name ? ` · ${a.name}` : ''}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAccount(a); setShowAccountMenu(false) }}
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {acc && (
            <button
              onClick={() => setShowImportModal('existing')}
              className="btn-secondary text-sm"
            >
              Import CSV
            </button>
          )}
          <button
            onClick={() => setShowImportModal('new')}
            className="btn-secondary text-sm"
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Market Chart */}
      {/* <MarketChart /> */}

      {!acc && allAccounts.length === 0 ? (
        /* Empty state — no accounts yet */
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="text-4xl mb-2">📊</div>
          <h2 className="text-lg font-semibold text-white">No accounts yet</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Import your Tradovate trade history to get started
          </p>
          <button
            onClick={() => setShowImportModal('new')}
            className="btn-primary mt-2"
          >
            Import Account
          </button>
        </div>
      ) : (
        <>
          {/* Primary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              label="Total P&L"
              value={`${(acc?.totalPnl || 0) >= 0 ? '+' : ''}$${(acc?.totalPnl || 0).toFixed(2)}`}
              positive={(acc?.totalPnl || 0) > 0}
              negative={(acc?.totalPnl || 0) < 0}
              subValue={acc?.percentReturn != null ? `${acc.percentReturn >= 0 ? '+' : ''}${acc.percentReturn.toFixed(2)}% return` : undefined}
            />
            <StatCard
              label="Balance"
              value={acc?.currentBalance != null ? `$${Number(acc.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              subValue={acc?.balance ? `Starting $${Number(acc.balance).toLocaleString()}` : undefined}
              positive={(acc?.currentBalance || 0) > (acc?.balance || 0)}
              negative={(acc?.currentBalance || 0) < (acc?.balance || 0)}
            />
            <StatCard
              label="Win Rate"
              value={`${(acc?.winRate || 0).toFixed(1)}%`}
              positive={(acc?.winRate || 0) >= 55}
            />
            <StatCard
              label="Profit Factor"
              value={(acc?.profitFactor || 0).toFixed(2)}
              positive={(acc?.profitFactor || 0) >= 1.5}
              negative={(acc?.profitFactor || 0) < 1 && (acc?.totalTrades || 0) > 0}
            />
            <StatCard
              label="Total Trades"
              value={acc?.totalTrades || 0}
              neutral
              subValue={`${acc?.tradingDays || 0} days`}
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Avg Day" value={`$${(acc?.avgDayPnl || 0).toFixed(2)}`} positive={(acc?.avgDayPnl || 0) > 0} negative={(acc?.avgDayPnl || 0) < 0} />
            <StatCard label="Best Day" value={`+$${(acc?.bestDayPnl || 0).toFixed(2)}`} positive />
            <StatCard label="Worst Day" value={`$${(acc?.worstDayPnl || 0).toFixed(2)}`} negative={(acc?.worstDayPnl || 0) < 0} />
          </div>

          {/* Analytics row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ExecutionBars
              entryPrecision={acc?.entryPrecision}
              stopDiscipline={acc?.stopDiscipline}
              tradeManagement={acc?.tradeManagement}
              revengeTradeRate={acc?.revengeTradeRate}
            />
            <AICoachPanel />
          </div>

          {/* Recent trades */}
          <TradeTimeline accountId={acc?.id} />
        </>
      )}

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={(updated) => {
            setAllAccounts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
            if (acc?.id === updated.id) setAcc((prev: any) => ({ ...prev, ...updated }))
            setEditingAccount(null)
          }}
        />
      )}

      {showImportModal && (
        <ImportAccountModal
          onClose={() => setShowImportModal(null)}
          accountId={showImportModal === 'existing' ? acc?.id : undefined}
          onSuccess={() => {
            refetchStats()
            apolloClient.query({ query: LIST_ACCOUNTS, fetchPolicy: 'network-only' })
              .then(({ data }) => { if (data?.accounts?.length) setAllAccounts(data.accounts) })
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
