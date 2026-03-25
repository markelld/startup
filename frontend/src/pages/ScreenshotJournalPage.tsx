import { useState, useRef, useEffect } from 'react'
import { useMutation, useApolloClient } from '@apollo/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns'
import { MONTH_SESSIONS, TODAY_SESSION, LIST_ACCOUNTS } from '../lib/graphql/queries'
import { CREATE_TRADE, DELETE_ACCOUNT, DELETE_TRADE, UPDATE_TRADE_JOURNAL } from '../lib/graphql/mutations'
import { useAccountStore } from '../stores/accountStore'
import TradeDetailModal from '../components/TradeDetailModal'

const EMOTIONS = ['Calm', 'Focused', 'Anxious', 'Greedy', 'Fearful', 'Confident', 'Frustrated', 'Angry']

// ── Add Trade Modal ────────────────────────────────────────────────────────────
function AddTradeModal({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: (date: string) => void }) {
  const [form, setForm] = useState({
    instrument: 'MNQH6', side: 'short', quantity: 1,
    entryPrice: '', exitPrice: '', stopLoss: '', targetPrice: '', netPnl: '',
    entryTime: '09:30', exitTime: '10:00',
    notes: '', emotion: '',
  })
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  const [createTrade, { loading }] = useMutation(CREATE_TRADE, {
    onCompleted: async (data) => {
      if (data.createTrade.errors?.length > 0) { setErrors(data.createTrade.errors); return }
      const tradeId = data.createTrade.trade?.id
      if (screenshotFile && tradeId) {
        setUploading(true)
        try {
          const token = localStorage.getItem('zone_token')
          const accountId = localStorage.getItem('zone_account_id')
          const fd = new FormData()
          fd.append('file', screenshotFile)
          await fetch(`http://localhost:3001/trades/${tradeId}/screenshot`, {
            method: 'POST',
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
              ...(accountId ? { 'X-Account-ID': accountId } : {}),
            },
            body: fd,
          })
        } catch (e) {
          console.error('Screenshot upload failed', e)
        } finally {
          setUploading(false)
        }
      }
      onSaved(date)
    },
    onError: (err) => setErrors([err.message]),
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleScreenshotPick = (file: File) => {
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    if (!form.entryPrice) { setErrors(['Entry price is required']); return }

    const enteredAt = `${date}T${form.entryTime}:00`
    const exitedAt = form.exitTime ? `${date}T${form.exitTime}:00` : undefined

    createTrade({
      variables: {
        instrument: form.instrument,
        side: form.side,
        quantity: Number(form.quantity),
        entryPrice: Number(form.entryPrice),
        exitPrice: form.exitPrice ? Number(form.exitPrice) : undefined,
        stopLoss: form.stopLoss ? Number(form.stopLoss) : undefined,
        targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
        netPnl: form.netPnl ? Number(form.netPnl) : undefined,
        enteredAt,
        exitedAt,
        notes: form.notes || undefined,
        emotion: form.emotion || undefined,
        sessionDate: date,
      },
    })
  }

  const busy = loading || uploading
  const inputCls = 'w-full bg-surface-900 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Add Trade — {format(parseISO(date), 'MMM d, yyyy')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
          onDragOver={e => e.preventDefault()}
          onDrop={e => e.preventDefault()}
        >
          {/* Instrument + Side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Instrument</label>
              <input className={inputCls} value={form.instrument} onChange={e => set('instrument', e.target.value)} placeholder="MNQH6" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Side</label>
              <div className="flex gap-2">
                {['long', 'short'].map(s => (
                  <button key={s} type="button" onClick={() => set('side', s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      form.side === s
                        ? s === 'long' ? 'bg-green/20 border-green text-green' : 'bg-red/20 border-red text-red'
                        : 'border-border text-gray-400 hover:border-gray-500'
                    }`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Qty + Entry + Exit */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Qty</label>
              <input type="number" min={1} className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Entry Price</label>
              <input type="number" step="0.01" className={inputCls} value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Exit Price</label>
              <input type="number" step="0.01" className={inputCls} value={form.exitPrice} onChange={e => set('exitPrice', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Stop Loss + Target + Net P&L */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Stop Loss</label>
              <input type="number" step="0.01" className={inputCls} value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target</label>
              <input type="number" step="0.01" className={inputCls} value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Net P&L</label>
              <input type="number" step="0.01" className={inputCls} value={form.netPnl} onChange={e => set('netPnl', e.target.value)} placeholder="auto-calc" />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Entry Time</label>
              <input type="time" className={inputCls} value={form.entryTime} onChange={e => set('entryTime', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Exit Time</label>
              <input type="time" className={inputCls} value={form.exitTime} onChange={e => set('exitTime', e.target.value)} />
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Chart Screenshot</label>
            <div
              className="relative cursor-pointer"
              onClick={() => screenshotInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleScreenshotPick(f) }}
            >
              {screenshotPreview ? (
                <div className="relative group">
                  <img src={screenshotPreview} alt="preview" className="w-full rounded-lg border border-border max-h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white">Replace</span>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg h-16 flex flex-col items-center justify-center gap-1 hover:border-green/40 hover:bg-surface-200/30 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs text-gray-600">Click or drag chart image (optional)</span>
                </div>
              )}
              <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotPick(f) }} />
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Emotion</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONS.map(em => (
                <button key={em} type="button" onClick={() => set('emotion', form.emotion === em ? '' : em)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.emotion === em ? 'bg-green text-surface-900 border-green' : 'border-border text-gray-400 hover:border-green/50'
                  }`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea rows={2} className={inputCls + ' resize-none'} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Entry reasoning, what you saw, lessons..." />
          </div>

          {errors.length > 0 && (
            <div className="text-red text-sm space-y-0.5">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="btn-primary flex-1 py-2.5 text-sm">
              {uploading ? 'Uploading screenshot…' : loading ? 'Saving…' : 'Add Trade'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Trade Card ────────────────────────────────────────────────────────────────
export function TradeCard({ trade, onUpdated }: { trade: any; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(trade.notes || '')
  const [emotion, setEmotion] = useState(trade.emotion || '')
  const [uploading, setUploading] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(trade.screenshotUrl || null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [updateJournal, { loading }] = useMutation(UPDATE_TRADE_JOURNAL, {
    onCompleted: () => { setEditing(false); onUpdated() },
  })

  const [deleteTrade, { loading: deleting }] = useMutation(DELETE_TRADE, {
    onCompleted: (data) => {
      if (data.deleteTrade.success) onUpdated()
      else setConfirmDelete(false)
    },
  })

  const handleScreenshotUpload = async (file: File) => {
    setUploading(true)
    try {
      const token = localStorage.getItem('zone_token')
      const accountId = localStorage.getItem('zone_account_id')
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`http://localhost:3001/trades/${trade.id}/screenshot`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          ...(accountId ? { 'X-Account-ID': accountId } : {}),
        },
        body: form,
      })
      const data = await res.json()
      if (data.url) setScreenshotUrl(data.url)
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setUploading(false)
    }
  }

  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="card">
      <div className="flex gap-6">
        {/* Left column — trade info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                trade.side === 'long' ? 'text-green border-green/30 bg-green/10' : 'text-red border-red/30 bg-red/10'
              }`}>{trade.side?.toUpperCase()}</span>
              <span className="font-medium text-white text-sm">{trade.instrument}</span>
              <span className="text-xs text-gray-500">{trade.quantity}x</span>
              {trade.enteredAt && (
                <span className="text-xs text-gray-500">{format(new Date(trade.enteredAt), 'HH:mm')}</span>
              )}
              {trade.grade && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                  trade.grade === 'A' ? 'text-green border-green/30' :
                  trade.grade === 'B' ? 'text-blue border-blue/30' :
                  trade.grade === 'F' ? 'text-red border-red/30' : 'text-amber border-amber/30'
                }`}>{trade.grade}</span>
              )}
              {trade.isRevengeTrade && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red/10 text-red border border-red/20">Revenge</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`font-mono text-sm font-semibold ${trade.netPnl >= 0 ? 'text-green' : 'text-red'}`}>
                {trade.netPnl >= 0 ? '+' : ''}${Number(trade.netPnl).toFixed(2)}
              </span>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Delete?</span>
                  <button
                    onClick={() => deleteTrade({ variables: { id: trade.id } })}
                    disabled={deleting}
                    className="text-xs px-2 py-0.5 bg-red/20 text-red rounded hover:bg-red/30"
                  >{deleting ? '…' : 'Yes'}</button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-2 py-0.5 bg-surface-200 text-gray-400 rounded hover:text-white"
                  >No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-gray-600 hover:text-red transition-colors"
                  title="Delete trade"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Price row */}
          {trade.entryPrice && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Entry <span className="text-gray-300">{Number(trade.entryPrice).toFixed(2)}</span></span>
              {trade.exitPrice && <span>Exit <span className="text-gray-300">{Number(trade.exitPrice).toFixed(2)}</span></span>}
              {trade.stopLoss && <span>Stop <span className="text-gray-300">{Number(trade.stopLoss).toFixed(2)}</span></span>}
              {trade.rMultiple != null && <span>R <span className="text-gray-300">{Number(trade.rMultiple).toFixed(2)}</span></span>}
              {trade.durationMinutes != null && <span>{trade.durationMinutes}min</span>}
            </div>
          )}

          {/* Journal */}
          {editing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {EMOTIONS.map(e => (
                  <button key={e} type="button" onClick={() => setEmotion(e)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      emotion === e ? 'bg-green text-surface-900 border-green' : 'border-border text-gray-400 hover:border-green/50'
                    }`}>{e}</button>
                ))}
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="What was your thinking?"
                className="w-full bg-surface-200 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green resize-none" />
              <div className="flex gap-2">
                <button onClick={() => updateJournal({ variables: { id: trade.id, notes, emotion } })}
                  disabled={loading} className="btn-primary text-xs py-1.5 px-3">
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {trade.emotion && (
                  <span className="text-xs text-green border border-green/20 bg-green/10 px-2 py-0.5 rounded-full mr-2">{trade.emotion}</span>
                )}
                {trade.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{trade.notes}</p>}
                {!trade.notes && !trade.emotion && (
                  <p className="text-xs text-gray-600 italic">No journal entry</p>
                )}
              </div>
              <button onClick={() => { setEditing(true); setNotes(trade.notes || ''); setEmotion(trade.emotion || '') }}
                className="text-xs text-blue hover:underline shrink-0">Edit</button>
            </div>
          )}
        </div>

        {/* Right column — screenshot */}
        <div
          className="w-40 md:w-52 shrink-0 relative group cursor-pointer rounded-lg overflow-hidden border border-border"
          onClick={() => screenshotUrl ? setLightboxOpen(true) : !uploading && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleScreenshotUpload(f) }}
        >
          {screenshotUrl ? (
            <>
              <img src={screenshotUrl} alt="chart" className="w-full h-full object-cover min-h-[120px]" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <span className="text-xs text-white font-medium">View</span>
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                  className="text-xs text-gray-300 hover:text-white"
                >Replace</button>
              </div>
            </>
          ) : (
            <div className={`h-full min-h-[120px] flex flex-col items-center justify-center gap-1.5 transition-colors ${
              uploading ? 'bg-green/5' : 'bg-surface-200/40 hover:bg-surface-200/70'
            }`}>
              {uploading ? (
                <span className="text-xs text-green">Uploading…</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs text-gray-600 text-center px-2">Click or drag screenshot</span>
                </>
              )}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotUpload(f) }} />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && screenshotUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={screenshotUrl}
            alt="chart"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none"
          >✕</button>
        </div>
      )}
    </div>
  )
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function Calendar({
  currentMonth, sessionMap, selectedDate, onSelectDate, onMonthChange
}: {
  currentMonth: Date
  sessionMap: Record<string, { netPnl: number; tradeCount: number }>
  selectedDate: string
  onSelectDate: (d: string) => void
  onMonthChange: (d: Date) => void
}) {
  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start, end })
  const startPad = getDay(start) // 0=Sun

  return (
    <div className="card select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="text-gray-400 hover:text-white px-3 py-1.5 rounded transition-colors text-lg">‹</button>
        <span className="text-base font-semibold text-white">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="text-gray-400 hover:text-white px-3 py-1.5 rounded transition-colors text-lg">›</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-8 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">{d}</div>
        ))}
        <div className="text-right text-xs text-gray-600 py-1 font-medium pr-1">Week</div>
      </div>

      {/* Day grid — one row per week */}
      <div className="space-y-1">
        {(() => {
          // Build flat array: blanks + days
          const cells: (Date | null)[] = [
            ...Array(startPad).fill(null),
            ...days,
          ]
          // Chunk into rows of 7
          const weeks: (Date | null)[][] = []
          for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7))
          }

          return weeks.map((week, wi) => {
            const weekPnl = week.reduce((sum, day) => {
              if (!day) return sum
              const s = sessionMap[format(day, 'yyyy-MM-dd')]
              return sum + (s?.netPnl ?? 0)
            }, 0)
            const weekHasData = week.some(day => day && !!sessionMap[format(day, 'yyyy-MM-dd')])
            const weekLabel = weekHasData
              ? Math.abs(weekPnl) >= 1000
                ? `${weekPnl >= 0 ? '+' : '-'}$${(Math.abs(weekPnl) / 1000).toFixed(1)}k`
                : `${weekPnl >= 0 ? '+' : ''}$${weekPnl.toFixed(0)}`
              : null

            return (
              <div key={wi} className="grid grid-cols-8 gap-x-1">
                {week.map((day, di) => {
                  if (!day) return <div key={`b${wi}-${di}`} />
                  const iso = format(day, 'yyyy-MM-dd')
                  const session = sessionMap[iso]
                  const isSelected = iso === selectedDate
                  const isToday = isSameDay(day, new Date())
                  const hasSession = !!session
                  const pnl = session?.netPnl ?? 0
                  const pnlLabel = hasSession
                    ? Math.abs(pnl) >= 1000
                      ? `${pnl >= 0 ? '+' : '-'}$${(Math.abs(pnl) / 1000).toFixed(1)}k`
                      : `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`
                    : null

                  return (
                    <button key={iso} onClick={() => onSelectDate(iso)}
                      className={`flex flex-col items-center justify-center py-2 rounded-xl transition-colors font-medium ${
                        isSelected
                          ? pnl >= 0 ? 'bg-green text-surface-900' : 'bg-red text-white'
                          : isToday
                          ? 'border border-green/40 text-white'
                          : hasSession
                          ? 'hover:bg-surface-50 text-white'
                          : 'text-gray-600 hover:bg-surface-50'
                      }`}>
                      <span className="text-sm leading-tight">{format(day, 'd')}</span>
                      {pnlLabel && (
                        <span className={`text-[10px] leading-tight font-mono mt-0.5 ${
                          isSelected ? 'opacity-80' : pnl >= 0 ? 'text-green' : 'text-red'
                        }`}>
                          {pnlLabel}
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Weekly total */}
                <div className="flex flex-col items-end justify-center pr-1">
                  {weekLabel && (
                    <span className={`text-[10px] font-mono font-semibold ${
                      weekPnl >= 0 ? 'text-green' : 'text-red'
                    }`}>
                      {weekLabel}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}


const GRADE_COLORS: Record<string, string> = {
  A: 'text-green border-green/30 bg-green/10',
  B: 'text-blue border-blue/30 bg-blue/10',
  C: 'text-amber border-amber/30 bg-amber/10',
  F: 'text-red border-red/30 bg-red/10',
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ScreenshotJournalPage() {
  const { account, setAccount } = useAccountStore()
  const apolloClient = useApolloClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [sessionKey, setSessionKey] = useState(0)

  const [daySession, setDaySession] = useState<any>(null)
  const [sessionMap, setSessionMap] = useState<Record<string, { netPnl: number; tradeCount: number }>>({})

  // Account switcher state
  const [allAccounts, setAllAccounts] = useState<any[]>([])
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [activeAccount, setActiveAccount] = useState<any>(account)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteTradeId, setConfirmDeleteTradeId] = useState<string | null>(null)

  const [deleteTrade] = useMutation(DELETE_TRADE, {
    onCompleted: (data) => {
      if (data.deleteTrade.success) {
        setConfirmDeleteTradeId(null)
        setSessionKey(k => k + 1)
      }
    },
  })

  const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
    onCompleted: (data) => {
      if (data.deleteAccount.success) {
        setAllAccounts(prev => {
          const remaining = prev.filter(a => a.id !== confirmDeleteId)
          if (activeAccount?.id === confirmDeleteId) {
            const next = remaining[0] ?? null
            setActiveAccount(next)
            setAccount(next ?? ({} as any))
            setSessionKey(k => k + 1)
          }
          return remaining
        })
      }
      setConfirmDeleteId(null)
    },
  })

  // Load accounts list once
  useEffect(() => {
    apolloClient.query({ query: LIST_ACCOUNTS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const accounts: any[] = data?.accounts || []
        if (accounts.length > 0) setAllAccounts(accounts)
      })
      .catch(() => {})
  }, [apolloClient])

  const switchAccount = (a: any) => {
    setAccount(a)
    setActiveAccount(a)
    setShowAccountMenu(false)
  }

  // Fetch day trades — re-runs when date, sessionKey, or account changes
  useEffect(() => {
    apolloClient.query({
      query: TODAY_SESSION,
      variables: { date: selectedDate },
      fetchPolicy: 'network-only',
    }).then(({ data }) => setDaySession(data?.tradingSession ?? null))
  }, [selectedDate, sessionKey, apolloClient])

  // Fetch month calendar dots — re-runs when month or account changes
  useEffect(() => {
    apolloClient.query({
      query: MONTH_SESSIONS,
      variables: { year: currentMonth.getFullYear(), month: currentMonth.getMonth() + 1 },
      fetchPolicy: 'network-only',
    }).then(({ data }) => {
      const map: Record<string, { netPnl: number; tradeCount: number }> = {}
      ;(data?.monthSessions || []).forEach((s: any) => {
        map[s.sessionDate] = { netPnl: Number(s.netPnl), tradeCount: s.tradeCount }
      })
      setSessionMap(map)
    })
  }, [currentMonth, sessionKey, apolloClient])

  const trades: any[] = (daySession?.trades || [])
    .slice()
    .sort((a: any, b: any) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime())

  const handleDaySaved = (savedDate?: string) => {
    if (savedDate && savedDate !== selectedDate) setSelectedDate(savedDate)
    setSessionKey(k => k + 1)
    setShowAddModal(false)
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left: Calendar */}
      <div className="w-full md:w-1/2 shrink-0 p-4 md:p-6 border-b md:border-b-0 md:border-r border-border space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-white">Journal</h1>
          <div className="relative mt-0.5">
            <button
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
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
        <Calendar
          currentMonth={currentMonth}
          sessionMap={sessionMap}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onMonthChange={setCurrentMonth}
        />

      </div>

      {/* Right: Trade cards */}
      <div className="flex-1">
        <div className="p-4 md:p-6 space-y-4">
          {/* Day header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {trades.length === 0 ? 'No trades recorded' : `${trades.length} trade${trades.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm py-2 px-4">
              + Add Trade
            </button>
          </div>

          {/* Session summary (moved from left panel) */}
          {daySession && (
            <div className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
                <span className={`font-mono text-sm font-semibold ${Number(daySession.netPnl) >= 0 ? 'text-green' : 'text-red'}`}>
                  {Number(daySession.netPnl) >= 0 ? '+' : ''}${Number(daySession.netPnl).toFixed(2)}
                </span>
              </div>
              {daySession.disciplineScore != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green rounded-full" style={{ width: `${daySession.disciplineScore}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{Number(daySession.disciplineScore).toFixed(0)}/100</span>
                </div>
              )}
            </div>
          )}

          {/* Trade cards */}
          {trades.length === 0 ? (
            <div className="card text-center py-16 space-y-3">
              <p className="text-gray-500 text-sm">No trades on this day</p>
              <button onClick={() => setShowAddModal(true)} className="btn-secondary text-sm py-2 px-4 mx-auto block">
                + Add manually
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade: any) => (
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
                    {confirmDeleteTradeId === trade.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Delete?</span>
                        <button
                          onClick={() => deleteTrade({ variables: { id: trade.id } })}
                          className="text-xs px-2 py-0.5 bg-red/20 text-red rounded hover:bg-red/30"
                        >Yes</button>
                        <button
                          onClick={() => setConfirmDeleteTradeId(null)}
                          className="text-xs px-2 py-0.5 bg-surface-200 text-gray-400 rounded hover:text-white"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteTradeId(trade.id)}
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
            </div>
          )}
        </div>
      </div>

      {/* Add Trade Modal */}
      {showAddModal && (
        <AddTradeModal
          date={selectedDate}
          onClose={() => setShowAddModal(false)}
          onSaved={handleDaySaved}
        />
      )}

      {/* Trade Detail Modal */}
      {selected && (
        <TradeDetailModal
          trade={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => setSelected((prev: any) => prev ? { ...prev, ...updated } : null)}
        />
      )}
    </div>
  )
}
