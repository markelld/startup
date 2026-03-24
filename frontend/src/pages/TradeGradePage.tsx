import { useMutation, useSubscription, useApolloClient } from '@apollo/client'
import { useState, useRef, useEffect, useCallback } from 'react'
import TradeReplayModal from '../components/TradeReplayModal'
import TradeDetailModal from '../components/TradeDetailModal'
import {
  format, addDays, subDays, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay,
} from 'date-fns'
import { TODAY_SESSION, LIST_ACCOUNTS } from '../lib/graphql/queries'
import { GRADE_SESSION, DELETE_ACCOUNT } from '../lib/graphql/mutations'
import { ON_SESSION_UPDATED } from '../lib/graphql/subscriptions'
import { useAccountStore } from '../stores/accountStore'

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green bg-green/10 border-green/30',
  B: 'text-blue bg-blue/10 border-blue/30',
  C: 'text-amber bg-amber/10 border-amber/30',
  F: 'text-red bg-red/10 border-red/30',
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  const val = score ?? 0
  const color = val >= 70 ? '#00D49C' : val >= 50 ? '#F5A623' : '#FF4D6A'
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono text-white">{val.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function DatePickerPopover({
  selectedDate,
  today,
  onSelect,
  onClose,
}: {
  selectedDate: string
  today: string
  onSelect: (d: string) => void
  onClose: () => void
}) {
  const [viewMonth, setViewMonth] = useState(parseISO(selectedDate))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const start = startOfMonth(viewMonth)
  const end = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start, end })
  const blanks = Array(getDay(start)).fill(null)

  return (
    <div
      ref={ref}
      className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-surface-100 border border-border rounded-xl shadow-2xl p-4 w-auto select-none sm:absolute sm:inset-x-auto sm:translate-y-0 sm:right-0 sm:top-full sm:mt-2 sm:w-72"
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="text-gray-400 hover:text-white px-2 py-1 rounded text-lg transition-colors"
        >‹</button>
        <span className="text-sm font-semibold text-white">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="text-gray-400 hover:text-white px-2 py-1 rounded text-lg transition-colors"
        >›</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-gray-600 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd')
          const isSelected = iso === selectedDate
          const isToday = isSameDay(day, new Date())
          const isFuture = iso > today

          return (
            <button
              key={iso}
              disabled={isFuture}
              onClick={() => { onSelect(iso); onClose() }}
              className={`flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-green text-surface-900'
                  : isToday
                  ? 'border border-green/40 text-white'
                  : isFuture
                  ? 'text-gray-700 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-surface-50'
              }`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Today shortcut */}
      <div className="mt-3 pt-3 border-t border-border">
        <button
          onClick={() => { onSelect(today); onClose() }}
          className="text-xs text-green hover:underline"
        >
          Jump to today
        </button>
      </div>
    </div>
  )
}

export default function TradeGradePage() {
  const { account, setAccount } = useAccountStore()
  const apolloClient = useApolloClient()
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [showPicker, setShowPicker] = useState(false)
  const [replayTrade, setReplayTrade] = useState<any | null>(null)
  const [journalTrade, setJournalTrade] = useState<any | null>(null)
  const [session, setSession] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [allAccounts, setAllAccounts] = useState<any[]>([])
  const [activeAccount, setActiveAccount] = useState<any>(account)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      if (data.deleteAccount.success) {
        setAllAccounts(prev => {
          const remaining = prev.filter(a => a.id !== confirmDeleteId)
          if (activeAccount?.id === confirmDeleteId) {
            const next = remaining[0] ?? null
            setActiveAccount(next)
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

  const switchAccount = (a: any) => {
    setAccount(a)
    setActiveAccount(a)
    setShowAccountMenu(false)
  }

  const fetchSession = useCallback(async () => {
    if (!account) return
    const { data } = await apolloClient.query({
      query: TODAY_SESSION,
      variables: { date: selectedDate },
      fetchPolicy: 'network-only',
    })
    setSession(data?.tradingSession ?? null)
  }, [account, selectedDate, apolloClient])

  useEffect(() => { fetchSession() }, [fetchSession])

  const [gradeSession, { loading }] = useMutation(GRADE_SESSION, {
    onCompleted: (data) => {
      if (data.gradeSession.errors?.length > 0) {
        setErrors(data.gradeSession.errors)
      } else {
        setErrors([])
        fetchSession()
      }
    },
    onError: (e) => setErrors([e.message]),
  })

  useSubscription(ON_SESSION_UPDATED, {
    variables: { sessionId: session?.id },
    skip: !session?.id,
    onData: () => fetchSession(),
  })

  const trades = session?.trades || []

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Trade Grader</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered trade analysis</p>
          <div className="relative mt-0.5">
            <button
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span>{activeAccount?.firmName || activeAccount?.name || 'No account'}</span>
              {allAccounts.length > 0 && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        <button onClick={() => deleteAccount({ variables: { id: a.id } })} className="text-xs px-2 py-1 bg-red/20 text-red rounded hover:bg-red/30">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 bg-surface-200 text-gray-400 rounded hover:bg-surface-50">No</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => switchAccount(a)}
                          className={`flex-1 text-left py-2.5 text-sm transition-colors ${a.id === activeAccount?.id ? 'text-green' : 'text-gray-300'}`}
                        >
                          {a.firmName || a.name}{a.firmName && a.name ? ` · ${a.name}` : ''}
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
        {/* Date nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            className="text-gray-400 hover:text-white px-2 py-1.5 rounded-lg bg-surface-100 border border-border transition-colors text-lg leading-none"
          >‹</button>

          <div className="relative">
            <button
              onClick={() => setShowPicker(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-sm text-white hover:border-green/50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {format(parseISO(selectedDate), 'MMM d, yyyy')}
            </button>

            {showPicker && (
              <DatePickerPopover
                selectedDate={selectedDate}
                today={today}
                onSelect={setSelectedDate}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>

          <button
            onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            disabled={selectedDate >= today}
            className="text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1.5 rounded-lg bg-surface-100 border border-border transition-colors text-lg leading-none"
          >›</button>
        </div>
      </div>

      {/* Grade Day button + errors */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
        {trades.length > 0 && !trades[0]?.grade && (
          <button
            onClick={() => gradeSession({ variables: { date: selectedDate } })}
            disabled={loading}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Grading…
              </>
            ) : '✦ Grade Day'}
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="card border-red/30 bg-red/5 text-red text-sm space-y-1">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <div className="space-y-4">
        {trades.length === 0 && (
          <div className="card text-center text-gray-500 py-12">No trades on this day</div>
        )}
        {trades.map((trade: any) => (
          <div key={trade.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded border ${
                  trade.side === 'long' ? 'text-green border-green/30 bg-green/10' : 'text-red border-red/30 bg-red/10'
                }`}>
                  {trade.side?.toUpperCase()}
                </span>
                <span className="font-medium text-white">{trade.instrument} · {trade.quantity}x</span>
                <span className="text-xs text-gray-400">R: {trade.rMultiple?.toFixed(2) || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                {trade.offPlaybook && (
                  <span className="text-xs text-amber bg-amber/10 border border-amber/20 px-1.5 py-0.5 rounded">
                    OFF PLAYBOOK
                  </span>
                )}
                {trade.grade && (
                  <span className={`text-sm font-bold px-2 py-1 rounded-lg border ${GRADE_COLORS[trade.grade] || ''}`}>
                    {trade.grade}
                  </span>
                )}
                <span className={`font-mono text-sm font-semibold ${trade.netPnl >= 0 ? 'text-green' : 'text-red'}`}>
                  {trade.netPnl >= 0 ? '+' : ''}${trade.netPnl?.toFixed(2)}
                </span>
              </div>
            </div>

            {trade.compositeScore != null && (
              <div className="grid grid-cols-4 gap-2">
                <ScoreBar label="Setup" score={trade.setupScore} />
                <ScoreBar label="Entry" score={trade.entryScore} />
                <ScoreBar label="Risk" score={trade.riskScore} />
                <ScoreBar label="Mgmt" score={trade.mgmtScore} />
              </div>
            )}

            {trade.coachingNotes && (
              <p className="text-xs text-gray-300 bg-surface-200 rounded-lg p-3 leading-relaxed">
                {trade.coachingNotes}
              </p>
            )}

            {!trade.notes && !trade.emotion && (
              <button
                onClick={() => setJournalTrade(trade)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-green/5 border border-green/20 hover:bg-green/10 transition-colors text-left"
              >
                <span className="text-green text-xs">✦</span>
                <span className="text-xs text-green font-medium">Add notes & emotion</span>
                <span className="text-xs text-gray-500 ml-1">— helps the AI grade this trade more accurately</span>
              </button>
            )}

            {(trade.notes || trade.emotion) && (
              <button
                onClick={() => setJournalTrade(trade)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <span>{trade.emotion || '—'}</span>
                {trade.notes && <span className="truncate max-w-[200px]">{trade.notes}</span>}
                <span className="text-gray-600">· Edit</span>
              </button>
            )}

            {trade.enteredAt && (
              <div>
                <button
                  onClick={() => setReplayTrade(trade)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white bg-surface-200 hover:bg-surface-50 border border-border rounded-lg transition-colors"
                >
                  <span>▶</span> Replay
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {journalTrade && (
        <TradeDetailModal
          trade={journalTrade}
          initialEditing={!journalTrade.notes && !journalTrade.emotion}
          onClose={() => setJournalTrade(null)}
          onSaved={(updated) => {
            setSession((prev: any) => prev ? {
              ...prev,
              trades: prev.trades.map((t: any) => t.id === journalTrade.id ? { ...t, ...updated } : t)
            } : prev)
            setJournalTrade((prev: any) => prev ? { ...prev, ...updated } : null)
          }}
        />
      )}

      {replayTrade && (
        <TradeReplayModal
          trade={{
            id:          replayTrade.id,
            instrument:  replayTrade.instrument,
            side:        replayTrade.side,
            entryPrice:  replayTrade.entryPrice,
            exitPrice:   replayTrade.exitPrice,
            stopLoss:    replayTrade.stopLoss,
            targetPrice: replayTrade.targetPrice,
            enteredAt:   replayTrade.enteredAt,
            exitedAt:    replayTrade.exitedAt,
            netPnl:      replayTrade.netPnl,
          }}
          onClose={() => setReplayTrade(null)}
        />
      )}
    </div>
  )
}
