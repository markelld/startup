import { useRef, useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import html2canvas from 'html2canvas'
import {
  startOfWeek, endOfMonth, startOfMonth, eachDayOfInterval, getDay,
  format, parseISO, subDays, addDays, isSameDay, addMonths, subMonths,
} from 'date-fns'
import { TODAY_SESSION, WEEK_SESSIONS } from '../lib/graphql/queries'
import { useAccountStore } from '../stores/accountStore'

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

  const start  = startOfMonth(viewMonth)
  const end    = endOfMonth(viewMonth)
  const days   = eachDayOfInterval({ start, end })
  const blanks = Array(getDay(start)).fill(null)

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-50 bg-surface-100 border border-border rounded-xl shadow-2xl p-4 w-72 select-none"
    >
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="text-gray-400 hover:text-white px-2 py-1 rounded text-lg">‹</button>
        <span className="text-sm font-semibold text-white">{format(viewMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="text-gray-400 hover:text-white px-2 py-1 rounded text-lg">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-gray-600 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(day => {
          const iso      = format(day, 'yyyy-MM-dd')
          const isSelected = iso === selectedDate
          const isToday  = isSameDay(day, new Date())
          const isFuture = iso > today
          return (
            <button
              key={iso}
              disabled={isFuture}
              onClick={() => { onSelect(iso); onClose() }}
              className={`flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-colors ${
                isSelected ? 'bg-green text-surface-900'
                : isToday  ? 'border border-green/40 text-white'
                : isFuture ? 'text-gray-700 cursor-not-allowed'
                : 'text-gray-300 hover:bg-surface-50'
              }`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <button onClick={() => { onSelect(today); onClose() }} className="text-xs text-green hover:underline">
          Jump to today
        </button>
      </div>
    </div>
  )
}

type CardType = 'day' | 'trade' | 'week'

const CARD_TYPES: { type: CardType; label: string }[] = [
  { type: 'day',   label: 'Day Summary' },
  { type: 'trade', label: 'Best Trade'  },
  { type: 'week',  label: 'Week Stats'  },
]

const GRADE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: '#00D49C', bg: 'rgba(0,212,156,0.12)', border: 'rgba(0,212,156,0.3)' },
  B: { text: '#4A9EFF', bg: 'rgba(74,158,255,0.12)', border: 'rgba(74,158,255,0.3)' },
  C: { text: '#F5A623', bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.3)' },
  F: { text: '#FF4D6A', bg: 'rgba(255,77,106,0.12)', border: 'rgba(255,77,106,0.3)' },
}

const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

async function buildCanvasBlob(el: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(el, { backgroundColor: '#0A0A0F', scale: 2, useCORS: true })
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png')
  )
}

export default function ShareCardPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardType, setCardType] = useState<CardType>('day')
  const [busy, setBusy] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const { account } = useAccountStore()
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data } = useQuery(TODAY_SESSION, {
    variables: { date: selectedDate },
    skip: !account,
    fetchPolicy: 'network-only',
  })

  const { data: weekData } = useQuery(WEEK_SESSIONS, {
    variables: { weekOf },
    skip: !account,
    fetchPolicy: 'network-only',
  })

  const session = data?.tradingSession
  const weekSessions: any[] = weekData?.weekSessions || []
  const weekPnl = weekSessions.reduce((sum, s) => sum + Number(s.netPnl), 0)
  const weekTrades = weekSessions.reduce((sum, s) => sum + (s.tradeCount || 0), 0)
  const weekWinRate = weekSessions.length > 0
    ? weekSessions.reduce((sum, s) => sum + (s.winRate || 0), 0) / weekSessions.length
    : 0
  const bestDay = weekSessions.reduce((best: any, s) =>
    (!best || Number(s.netPnl) > Number(best.netPnl) ? s : best), null)

  const bestTrade = session?.trades
    ?.filter((t: any) => t.status === 'closed')
    .sort((a: any, b: any) => b.netPnl - a.netPnl)[0]

  const pnl = Number(session?.netPnl || 0)
  const pnlStr = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
  const tweetText = encodeURIComponent(
    `${pnlStr} today on ${account?.firmName || 'Zone'} 📈\n${session?.winRate?.toFixed(1) ?? 0}% win rate · ${session?.tradeCount ?? 0} trades\n\nTracked with zone.app`
  )
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`

  const handleNativeShare = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const blob = await buildCanvasBlob(cardRef.current)
      const file = new File([blob], `zone-${cardType}-${today}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Zone Trade Card' })
      } else {
        await navigator.share({ title: 'Zone Trade Card', text: decodeURIComponent(tweetText) })
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const blob = await buildCanvasBlob(cardRef.current)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `zone-${cardType}-${today}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  const gradeStyle = bestTrade?.grade ? GRADE_COLORS[bestTrade.grade] : null

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Share Card</h1>

        <div className="flex items-center gap-2">
          <button onClick={handleDownload} disabled={busy} title="Download PNG"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="hidden sm:inline">{busy ? 'Saving…' : 'Save'}</span>
          </button>

          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" title="Post to X / Twitter"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="hidden sm:inline">Twitter</span>
          </a>

          <button onClick={canNativeShare ? handleNativeShare : handleDownload} disabled={busy} title="Share"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
            <span className="hidden sm:inline">Instagram</span>
          </button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {CARD_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setCardType(type)}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${
              cardType === type
                ? 'bg-green text-surface-900 border-green font-semibold'
                : 'border-border text-gray-400 hover:border-green/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date nav — Day Summary only */}
      {cardType === 'day' && (
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
              {format(parseISO(selectedDate), 'EEE, MMM d, yyyy')}
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
      )}


      {/* Card preview */}
      <div
        ref={cardRef}
        className="share-card w-full max-w-sm mx-auto"
        style={{
          '--surface':       '#111118',
          '--surface-50':    '#1A1A24',
          '--surface-100':   '#141420',
          '--surface-200':   '#0E0E18',
          '--surface-900':   '#0A0A0F',
          '--color-border':  '#2A2A3A',
          '--color-green':   '#00D49C',
          '--color-green-500': '#00B882',
        } as React.CSSProperties}
      >

        {/* ── Day Summary card ─────────────────────────────────────── */}
        {cardType === 'day' && (
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green rounded-lg flex items-center justify-center text-xs font-bold text-surface-900">Z</div>
                <span className="text-sm font-semibold text-white">Zone</span>
              </div>
              <span className="text-xs text-gray-500">{account?.firmName || account?.name}</span>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</p>
              <p className={`text-4xl font-mono font-bold ${pnl >= 0 ? 'text-green' : 'text-red'}`}>{pnlStr}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500">Win Rate</p>
                <p className="text-sm font-mono font-semibold text-white">{(session?.winRate || 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Trades</p>
                <p className="text-sm font-mono font-semibold text-white">{session?.tradeCount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">P. Factor</p>
                <p className="text-sm font-mono font-semibold text-white">{(session?.profitFactor || 0).toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">zone.app</p>
          </div>
        )}

        {/* ── Best Trade card ──────────────────────────────────────── */}
        {cardType === 'trade' && bestTrade && (
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green rounded-lg flex items-center justify-center text-xs font-bold text-surface-900">Z</div>
                <span className="text-sm font-semibold text-white">Zone</span>
              </div>
              {bestTrade.grade && gradeStyle && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-lg border"
                  style={{ color: gradeStyle.text, background: gradeStyle.bg, borderColor: gradeStyle.border }}
                >
                  Grade {bestTrade.grade}
                </span>
              )}
            </div>

            {/* Instrument + side */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                bestTrade.side === 'long' ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {bestTrade.side?.toUpperCase()}
              </span>
              <span className="text-base font-semibold text-white">{bestTrade.instrument}</span>
              <span className="text-xs text-gray-500">{bestTrade.quantity}x</span>
            </div>

            {/* P&L hero */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Net P&L</p>
              <p className="text-4xl font-mono font-bold text-green">
                +${bestTrade.netPnl?.toFixed(2)}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500">Entry</p>
                <p className="text-sm font-mono text-white">{bestTrade.entryPrice ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Exit</p>
                <p className="text-sm font-mono text-white">{bestTrade.exitPrice ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">R-Multiple</p>
                <p className="text-sm font-mono text-white">
                  {bestTrade.rMultiple != null ? `${bestTrade.rMultiple.toFixed(2)}R` : '—'}
                </p>
              </div>
            </div>

            {/* Duration + time */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">
                {bestTrade.enteredAt ? format(new Date(bestTrade.enteredAt), 'HH:mm') : ''}
                {bestTrade.durationMinutes != null ? ` · ${bestTrade.durationMinutes}m` : ''}
              </p>
              <p className="text-xs text-gray-600">zone.app</p>
            </div>
          </div>
        )}

        {cardType === 'trade' && !bestTrade && (
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 text-center space-y-2">
            <p className="text-gray-400 text-sm">No closed trades on this day</p>
            <p className="text-xs text-gray-600">Use the arrows above to pick a different date</p>
          </div>
        )}

        {/* ── Week Summary card ────────────────────────────────────── */}
        {cardType === 'week' && (
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-purple rounded-lg flex items-center justify-center text-xs font-bold text-white">Z</div>
                <span className="text-sm font-semibold text-white">Zone</span>
              </div>
              <span className="text-xs text-gray-500">{account?.firmName || account?.name}</span>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">
                Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </p>
              <p className={`text-4xl font-mono font-bold ${weekPnl >= 0 ? 'text-green' : 'text-red'}`}>
                {weekPnl >= 0 ? '+' : ''}${weekPnl.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500">Win Rate</p>
                <p className="text-sm font-mono font-semibold text-white">{weekWinRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Trades</p>
                <p className="text-sm font-mono font-semibold text-white">{weekTrades}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Days</p>
                <p className="text-sm font-mono font-semibold text-white">{weekSessions.length}</p>
              </div>
            </div>

            {bestDay && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-gray-500 mb-0.5">Best day</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{format(new Date(bestDay.sessionDate), 'EEEE, MMM d')}</span>
                  <span className="text-sm font-mono text-green font-semibold">+${Number(bestDay.netPnl).toFixed(2)}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-600">zone.app</p>
          </div>
        )}
      </div>

      {!canNativeShare && (
        <p className="text-xs text-gray-500 text-center">
          Save the card, then attach it when posting to Instagram or Discord.
        </p>
      )}
    </div>
  )
}
