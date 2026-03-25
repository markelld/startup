import { useState, useEffect, useRef, useCallback } from 'react'
import { useApolloClient, useMutation } from '@apollo/client'
import { format } from 'date-fns'
import TradeDetailModal from '../TradeDetailModal'
import { PAGINATED_TRADES } from '../../lib/graphql/queries'
import { DELETE_TRADE } from '../../lib/graphql/mutations'

const PAGE_SIZE = 5

interface Trade {
  id: string
  instrument: string
  side: string
  quantity: number
  netPnl: number
  enteredAt?: string
  exitedAt?: string
  durationMinutes?: number
  grade?: string
  isRevengeTrade?: boolean
  entryPrice?: number
  exitPrice?: number
  stopLoss?: number
  targetPrice?: number
  rMultiple?: number
  emotion?: string
  screenshotUrl?: string
  coachingNotes?: string
  setupScore?: number
  entryScore?: number
  riskScore?: number
  mgmtScore?: number
  compositeScore?: number
  status?: string
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green border-green/30 bg-green/10',
  B: 'text-blue border-blue/30 bg-blue/10',
  C: 'text-amber border-amber/30 bg-amber/10',
  F: 'text-red border-red/30 bg-red/10',
}

export default function TradeTimeline({ accountId }: { accountId?: string }) {
  const apolloClient = useApolloClient()
  const [trades, setTrades] = useState<Trade[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Trade | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const loadingRef = useRef(false)

  const [deleteTrade] = useMutation(DELETE_TRADE, {
    onCompleted: (data) => {
      if (data.deleteTrade.success) {
        setTrades(prev => prev.filter(t => t.id !== confirmDeleteId))
        setConfirmDeleteId(null)
      }
    },
  })

  const fetchMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const { data } = await apolloClient.query({
        query: PAGINATED_TRADES,
        variables: { limit: PAGE_SIZE, offset: offsetRef.current },
        fetchPolicy: 'network-only',
      })
      const incoming: Trade[] = data?.trades || []
      setTrades(prev => offsetRef.current === 0 ? incoming : [...prev, ...incoming])
      setHasMore(incoming.length === PAGE_SIZE)
      offsetRef.current += incoming.length
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [apolloClient])

  // Reset and reload when account switches
  useEffect(() => {
    offsetRef.current = 0
    setTrades([])
    setHasMore(true)
    fetchMore()
  }, [accountId])

  // Scroll listener on the container
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        fetchMore()
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [fetchMore])

  // If container isn't scrollable after a fetch (fewer items than fill height), auto-load more
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasMore || loadingRef.current) return
    if (el.scrollHeight <= el.clientHeight) {
      fetchMore()
    }
  }, [trades, hasMore, fetchMore])

  return (
    <>
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Trades</h3>
        <div ref={scrollRef} className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {trades.length === 0 && !loading && (
            <p className="text-center text-gray-500 text-sm py-6">No trades recorded yet</p>
          )}
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="w-full flex items-center justify-between p-3 bg-surface-50 hover:bg-surface-100 rounded-lg border border-border transition-colors group"
            >
              <button onClick={() => setSelected(trade)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                  trade.side === 'long' ? 'text-green border-green/20 bg-green/10' : 'text-red border-red/20 bg-red/10'
                }`}>
                  {trade.side?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{trade.instrument}</span>
                    <span className="text-xs text-gray-400">{trade.quantity}x</span>
                    {trade.isRevengeTrade && (
                      <span className="text-xs text-red bg-red/10 border border-red/20 px-1 rounded">REVENGE</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {trade.enteredAt ? format(new Date(trade.enteredAt), 'MMM d · HH:mm') : '—'}
                    {trade.durationMinutes ? ` · ${trade.durationMinutes}m` : ''}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                {trade.grade && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${GRADE_COLORS[trade.grade] || 'text-gray-400'}`}>
                    {trade.grade}
                  </span>
                )}
                <span className={`font-mono text-sm font-semibold ${(trade.netPnl ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>
                  {(trade.netPnl ?? 0) >= 0 ? '+' : ''}${(trade.netPnl ?? 0).toFixed(2)}
                </span>
                {confirmDeleteId === trade.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Delete?</span>
                    <button
                      onClick={() => deleteTrade({ variables: { id: trade.id } })}
                      className="text-xs px-2 py-0.5 bg-red/20 text-red rounded hover:bg-red/30"
                    >Yes</button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2 py-0.5 bg-surface-200 text-gray-400 rounded hover:text-white"
                    >No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(trade.id)}
                    className="text-gray-600 hover:text-red transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete trade"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="py-1 flex justify-center">
            {loading && <span className="text-xs text-gray-600">Loading…</span>}
            {!hasMore && trades.length > 0 && <span className="text-xs text-gray-700">All trades loaded</span>}
          </div>
        </div>
      </div>

      {selected && (
        <TradeDetailModal
          trade={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, ...updated } : t))
            setSelected(prev => prev ? { ...prev, ...updated } : null)
          }}
        />
      )}
    </>
  )
}
