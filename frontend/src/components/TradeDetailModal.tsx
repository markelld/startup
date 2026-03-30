import { useState, useRef } from 'react'
import { useMutation } from '@apollo/client'
import { UPDATE_TRADE_JOURNAL } from '../lib/graphql/mutations'
import TradeReplayModal from './TradeReplayModal'

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green border-green/30 bg-green/10',
  B: 'text-blue border-blue/30 bg-blue/10',
  C: 'text-amber border-amber/30 bg-amber/10',
  F: 'text-red border-red/30 bg-red/10',
}

const EMOTIONS = ['Calm', 'Focused', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'Frustrated', 'Angry']

function ScoreBar({ label, score }: { label: string; score?: number }) {
  const val = score ?? 0
  const color = val >= 70 ? '#00D49C' : val >= 50 ? '#F5A623' : '#FF4D6A'
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono text-white">{val.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function StatRow({ label, value, mono = false }: { label: string; value: string | number | undefined; mono?: boolean }) {
  if (value === undefined || value === null) return null
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm text-white ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

interface Trade {
  id: string
  instrument: string
  side: string
  quantity: number
  entryPrice?: number
  exitPrice?: number
  stopLoss?: number
  targetPrice?: number
  netPnl: number
  grade?: string
  rMultiple?: number
  durationMinutes?: number
  enteredAt?: string
  exitedAt?: string
  status?: string
  isRevengeTrade?: boolean
  offPlaybook?: boolean
  emotion?: string
  notes?: string
  screenshotUrl?: string
  coachingNotes?: string
  setupScore?: number
  entryScore?: number
  riskScore?: number
  mgmtScore?: number
  compositeScore?: number
}

interface Props {
  trade: Trade
  onClose: () => void
  onSaved?: (updated: Partial<Trade>) => void
  initialEditing?: boolean
}

export default function TradeDetailModal({ trade, onClose, onSaved, initialEditing = false }: Props) {
  const [showReplay, setShowReplay] = useState(false)
  const [editing, setEditing] = useState(initialEditing)
  const [notes, setNotes] = useState(trade.notes || '')
  const [emotion, setEmotion] = useState(trade.emotion || '')
  const [stopLoss, setStopLoss] = useState(trade.stopLoss?.toString() || '')
  const [targetPrice, setTargetPrice] = useState(trade.targetPrice?.toString() || '')
  const [entryPrice, setEntryPrice] = useState(trade.entryPrice?.toString() || '')
  const [exitPrice, setExitPrice] = useState(trade.exitPrice?.toString() || '')
  const [quantity, setQuantity] = useState(trade.quantity?.toString() || '')
  const [side, setSide] = useState(trade.side || 'long')
  const [netPnl, setNetPnl] = useState(trade.netPnl?.toString() || '')
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(trade.screenshotUrl || null)
  const [uploading, setUploading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [updateJournal, { loading: saving }] = useMutation(UPDATE_TRADE_JOURNAL, {
    onCompleted: (data) => {
      if (data.updateTradeJournal.errors?.length > 0) {
        setSaveError(data.updateTradeJournal.errors[0])
        return
      }
      setSaveError(null)
      setEditing(false)
      onSaved?.({
        notes,
        emotion,
        stopLoss:    stopLoss    ? parseFloat(stopLoss)    : undefined,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        entryPrice:  entryPrice  ? parseFloat(entryPrice)  : undefined,
        exitPrice:   exitPrice   ? parseFloat(exitPrice)   : undefined,
        quantity:    quantity    ? parseInt(quantity)      : undefined,
        side,
        netPnl:      netPnl      ? parseFloat(netPnl)      : undefined,
      })
    },
    onError: (e) => setSaveError(e.message),
  })

  const handleSave = () => {
    updateJournal({
      variables: {
        id:          trade.id,
        notes,
        emotion,
        stopLoss:    stopLoss    ? parseFloat(stopLoss)    : undefined,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        entryPrice:  entryPrice  ? parseFloat(entryPrice)  : undefined,
        exitPrice:   exitPrice   ? parseFloat(exitPrice)   : undefined,
        quantity:    quantity    ? parseInt(quantity)      : undefined,
        side,
        netPnl:      netPnl      ? parseFloat(netPnl)      : undefined,
      },
    })
  }

  const handleCancel = () => {
    setNotes(trade.notes || '')
    setEmotion(trade.emotion || '')
    setStopLoss(trade.stopLoss?.toString() || '')
    setTargetPrice(trade.targetPrice?.toString() || '')
    setEntryPrice(trade.entryPrice?.toString() || '')
    setExitPrice(trade.exitPrice?.toString() || '')
    setQuantity(trade.quantity?.toString() || '')
    setSide(trade.side || 'long')
    setNetPnl(trade.netPnl?.toString() || '')
    setSaveError(null)
    setEditing(false)
  }

  const handleScreenshotUpload = async (file: File) => {
    setUploading(true)
    try {
      const token = localStorage.getItem('zone_token')
      const accountId = localStorage.getItem('zone_account_id')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`http://localhost:3001/trades/${trade.id}/screenshot`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          ...(accountId ? { 'X-Account-ID': accountId } : {}),
        },
        body: fd,
      })
      const data = await res.json()
      if (data.url) setScreenshotUrl(data.url)
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setUploading(false)
    }
  }

  if (showReplay) {
    return <TradeReplayModal trade={trade} onClose={() => setShowReplay(false)} />
  }

  const pnlPositive = (trade.netPnl ?? 0) >= 0
  const enteredTime = trade.enteredAt ? new Date(trade.enteredAt).toLocaleString() : '—'
  const exitedTime  = trade.exitedAt  ? new Date(trade.exitedAt).toLocaleString()  : '—'
  const isGraded    = trade.compositeScore != null
  const needsJournal = !trade.notes && !trade.emotion

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 md:p-6">
      <div className="bg-surface-900 border border-border rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2 py-1 rounded border ${
              trade.side === 'long' ? 'text-green border-green/30 bg-green/10' : 'text-red border-red/30 bg-red/10'
            }`}>
              {trade.side?.toUpperCase()}
            </span>
            <span className="font-semibold text-white">{trade.instrument}</span>
            <span className="text-xs text-gray-500">{trade.quantity}x</span>
            {trade.isRevengeTrade && (
              <span className="text-xs text-red bg-red/10 border border-red/20 px-1.5 py-0.5 rounded">REVENGE</span>
            )}
            {trade.offPlaybook && (
              <span className="text-xs text-amber bg-amber/10 border border-amber/20 px-1.5 py-0.5 rounded">OFF PLAYBOOK</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {trade.grade && (
              <span className={`text-sm font-bold px-2 py-1 rounded-lg border ${GRADE_COLORS[trade.grade] || ''}`}>
                {trade.grade}
              </span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* P&L hero */}
          <div className="text-center py-2">
            <div className={`text-3xl font-mono font-bold ${pnlPositive ? 'text-green' : 'text-red'}`}>
              {pnlPositive ? '+' : ''}${(trade.netPnl ?? 0).toFixed(2)}
            </div>
            {trade.rMultiple != null && (
              <div className="text-sm text-gray-400 mt-1">
                R: <span className={trade.rMultiple >= 0 ? 'text-green' : 'text-red'}>{trade.rMultiple.toFixed(2)}R</span>
              </div>
            )}
          </div>

          {/* AI nudge — shown when no notes/emotion yet */}
          {needsJournal && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-full flex items-start gap-3 p-3 rounded-xl bg-green/5 border border-green/20 hover:bg-green/10 transition-colors text-left"
            >
              <span className="text-green mt-0.5">✦</span>
              <div>
                <p className="text-xs font-medium text-green">Add notes & emotion</p>
                <p className="text-xs text-gray-400 mt-0.5">The AI uses your journal entries to give more accurate coaching. Takes 10 seconds.</p>
              </div>
            </button>
          )}

          {/* Journal section — edit or display */}
          {editing ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Journal</p>

              {/* Emotion picker */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">How were you feeling?</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmotion(prev => prev === e ? '' : e)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        emotion === e
                          ? 'bg-green/10 border-green/40 text-green'
                          : 'bg-surface-100 border-border text-gray-400 hover:text-white hover:border-gray-500'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade prices */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Trade Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Side</label>
                    <select
                      value={side}
                      onChange={e => setSide(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green/40 transition-colors"
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Entry Price</label>
                    <input
                      type="number"
                      step="0.25"
                      value={entryPrice}
                      onChange={e => setEntryPrice(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Exit Price</label>
                    <input
                      type="number"
                      step="0.25"
                      value={exitPrice}
                      onChange={e => setExitPrice(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Stop Loss</label>
                    <input
                      type="number"
                      step="0.25"
                      value={stopLoss}
                      onChange={e => setStopLoss(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Target Price</label>
                    <input
                      type="number"
                      step="0.25"
                      value={targetPrice}
                      onChange={e => setTargetPrice(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green/40 transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1.5 block">Net P&amp;L ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={netPnl}
                      onChange={e => setNetPnl(e.target.value)}
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green/40 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Notes textarea */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Notes — what happened? why did you take this trade?</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="e.g. Waited for pullback to VWAP, entry felt clean, sized down because of news risk..."
                  className="w-full bg-surface-100 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-green/40 transition-colors"
                />
              </div>

              {saveError && <p className="text-xs text-red">{saveError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 btn-primary text-sm disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={handleCancel} className="flex-1 btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            (notes || emotion) && (
              <div className="bg-surface-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Journal</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
                {emotion && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Emotion:</span>
                    <span className="text-xs font-medium text-white">{emotion}</span>
                  </div>
                )}
                {notes && (
                  <p className="text-sm text-gray-300 leading-relaxed">{notes}</p>
                )}
              </div>
            )
          )}

          {/* Trade details */}
          <div className="bg-surface-100 rounded-xl px-4">
            <StatRow label="Entry Price"  value={trade.entryPrice}  mono />
            <StatRow label="Exit Price"   value={trade.exitPrice}   mono />
            <StatRow label="Stop Loss"    value={trade.stopLoss}    mono />
            <StatRow label="Target"       value={trade.targetPrice} mono />
            <StatRow label="Duration"     value={trade.durationMinutes ? `${trade.durationMinutes}m` : undefined} />
            <StatRow label="Entered"      value={enteredTime} />
            <StatRow label="Exited"       value={exitedTime} />
          </div>

          {/* Score bars */}
          {isGraded && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Execution Scores</p>
              <ScoreBar label="Setup"  score={trade.setupScore} />
              <ScoreBar label="Entry"  score={trade.entryScore} />
              <ScoreBar label="Risk"   score={trade.riskScore} />
              <ScoreBar label="Mgmt"   score={trade.mgmtScore} />
            </div>
          )}

          {/* Coaching notes */}
          {trade.coachingNotes && (
            <div className="bg-surface-100 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Coaching Notes</p>
              <p className="text-sm text-gray-300 leading-relaxed">{trade.coachingNotes}</p>
            </div>
          )}

          {/* Screenshot */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Screenshot</p>
            {screenshotUrl ? (
              <div className="relative group">
                <img
                  src={screenshotUrl}
                  alt="Trade screenshot"
                  className="w-full rounded-xl border border-border object-contain max-h-64"
                />
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-lg"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 hover:border-green/40 hover:bg-surface-200/30 transition-colors"
              >
                {uploading ? (
                  <span className="text-xs text-green">Uploading…</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-xs text-gray-500">Click to add screenshot</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotUpload(f) }}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
          {!editing && !notes && !emotion && (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-surface-100 hover:bg-surface-50 text-gray-300 border border-border rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              ✎ Add Journal Entry
            </button>
          )}
          {trade.enteredAt && (
            <button
              onClick={() => setShowReplay(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-green/10 hover:bg-green/20 text-green border border-green/30 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <span>▶</span> Replay
            </button>
          )}
          <button onClick={onClose} className="flex-1 btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
