import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts'

const PYTHON_API = import.meta.env.VITE_PYTHON_URL || 'http://localhost:8000'
const SPEEDS = [1, 5, 10, 30]
const INTERVALS = ['1m', '5m', '15m', '1h', '4h']

interface Trade {
  id: string
  instrument: string
  side: string
  entryPrice?: number
  exitPrice?: number
  stopLoss?: number
  targetPrice?: number
  enteredAt: string
  exitedAt?: string
  netPnl?: number
}

interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface Props {
  trade: Trade
  onClose: () => void
}

export default function TradeReplayModal({ trade, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<any>(null)
  const seriesRef    = useRef<any>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  const [bars, setBars]           = useState<Bar[]>([])
  const [playIndex, setPlayIndex] = useState(0)
  const [playing, setPlaying]     = useState(false)
  const [speed, setSpeed]         = useState(5)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [barInterval, setBarInterval] = useState('1m')
  const fetchBars = (interval: string | null) => {
    if (!trade.enteredAt) return
    setLoading(true)
    setError(null)
    setPlaying(false)
    setPlayIndex(0)

    const entryTs = Math.floor(new Date(trade.enteredAt).getTime() / 1000)
    const exitTs  = trade.exitedAt
      ? Math.floor(new Date(trade.exitedAt).getTime() / 1000)
      : entryTs + 3600

    const params = new URLSearchParams({ from_ts: String(entryTs), to_ts: String(exitTs) })
    if (interval) params.set('interval', interval)

    fetch(`${PYTHON_API}/replay/bars/${trade.instrument}?${params}`)
      .then(r => {
        if (!r.ok) return r.json().then(d => Promise.reject(d.detail || 'Failed to load bars'))
        return r.json()
      })
      .then(data => {
        setBars(data.bars)
        setBarInterval(data.interval)
        setLoading(false)
      })
      .catch(e => {
        setError(typeof e === 'string' ? e : `No data available for ${trade.instrument}`)
        setLoading(false)
      })
  }

  // Initial fetch
  useEffect(() => { fetchBars(null) }, [trade])

  // Initialize chart once bars are loaded
  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0F' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#2A2A3A' },
        horzLines: { color: '#2A2A3A' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2A2A3A' },
      timeScale: {
        borderColor: '#2A2A3A',
        timeVisible: true,
        secondsVisible: false,
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    // Compute full price range from all bars + price lines so the axis stays stable during replay
    const allLows  = bars.map(b => b.low)
    const allHighs = bars.map(b => b.high)
    const pricePoints = [...allLows, ...allHighs, trade.entryPrice]
    if (trade.stopLoss)    pricePoints.push(trade.stopLoss)
    if (trade.targetPrice) pricePoints.push(trade.targetPrice)
    if (trade.exitPrice)   pricePoints.push(trade.exitPrice)
    const minPrice = Math.min(...pricePoints)
    const maxPrice = Math.max(...pricePoints)
    const pad      = (maxPrice - minPrice) * 0.15

    const series = chart.addCandlestickSeries({
      upColor:        '#00D49C',
      downColor:      '#FF4D6A',
      borderUpColor:  '#00D49C',
      borderDownColor:'#FF4D6A',
      wickUpColor:    '#00D49C',
      wickDownColor:  '#FF4D6A',
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: minPrice - pad, maxValue: maxPrice + pad },
      }),
    })

    // Price lines
    series.createPriceLine({
      price: trade.entryPrice,
      color: '#00D49C',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Entry',
    })
    if (trade.stopLoss) {
      series.createPriceLine({
        price: trade.stopLoss,
        color: '#FF4D6A',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Stop',
      })
    }
    if (trade.targetPrice) {
      series.createPriceLine({
        price: trade.targetPrice,
        color: '#F5A623',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target',
      })
    }

    // Start replay at first bar; price scale is locked via autoscaleInfoProvider above
    series.setData([{ ...bars[0], time: bars[0].time as any }])

    chartRef.current  = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
    }
  }, [bars])

  // Update chart as playIndex changes
  useEffect(() => {
    if (!seriesRef.current || bars.length === 0) return

    seriesRef.current.setData(bars.slice(0, playIndex + 1).map((b: Bar) => ({ ...b, time: b.time as any })))

    const entryTs = Math.floor(new Date(trade.enteredAt).getTime() / 1000)
    const exitTs  = trade.exitedAt ? Math.floor(new Date(trade.exitedAt).getTime() / 1000) : null
    const cur     = bars[playIndex]

    const markers: any[] = []
    if (cur.time >= entryTs) {
      const eb = bars.reduce((p, b) => Math.abs(b.time - entryTs) < Math.abs(p.time - entryTs) ? b : p)
      markers.push({
        time:     eb.time as any,
        position: trade.side === 'long' ? 'belowBar' : 'aboveBar',
        shape:    trade.side === 'long' ? 'arrowUp'  : 'arrowDown',
        color:    '#00D49C',
        text:     'Entry',
      })
    }
    if (exitTs && cur.time >= exitTs) {
      const xb = bars.reduce((p, b) => Math.abs(b.time - exitTs) < Math.abs(p.time - exitTs) ? b : p)
      markers.push({
        time:     xb.time as any,
        position: trade.side === 'long' ? 'aboveBar' : 'belowBar',
        shape:    trade.side === 'long' ? 'arrowDown' : 'arrowUp',
        color:    '#FF4D6A',
        text:     'Exit',
      })
    }
    seriesRef.current.setMarkers(markers)

    if (playIndex >= bars.length - 1) setPlaying(false)
  }, [playIndex, bars])

  // Play timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!playing) return

    timerRef.current = setInterval(() => {
      setPlayIndex(prev => {
        if (prev >= bars.length - 1) { setPlaying(false); return prev }
        return prev + 1
      })
    }, 1000 / speed)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, speed, bars.length])

  const reset = useCallback(() => { setPlaying(false); setPlayIndex(0) }, [])

  const scrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false)
    setPlayIndex(Number(e.target.value))
  }

  const cur     = bars[playIndex]
  const entryTs = trade.enteredAt ? Math.floor(new Date(trade.enteredAt).getTime() / 1000) : 0
  const exitTs  = trade.exitedAt  ? Math.floor(new Date(trade.exitedAt).getTime() / 1000)  : 0
  const isInTrade = cur?.time >= entryTs
  const isExited  = exitTs && cur?.time >= exitTs

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 md:p-4">
      <div
        className="bg-surface-900 border border-border rounded-2xl w-full max-w-5xl flex flex-col"
        style={{ height: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-xs font-bold px-2 py-1 rounded border shrink-0 ${
              trade.side === 'long'
                ? 'text-green border-green/30 bg-green/10'
                : 'text-red border-red/30 bg-red/10'
            }`}>
              {trade.side?.toUpperCase()}
            </span>
            <span className="font-semibold text-white shrink-0">{trade.instrument}</span>
          </div>

          {/* Interval selector */}
          <div className="flex items-center gap-1">
            {INTERVALS.map(iv => (
              <button
                key={iv}
                onClick={() => {
                  fetchBars(iv)
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  barInterval === iv
                    ? 'bg-green/20 text-green border border-green/30'
                    : 'text-gray-400 hover:text-white hover:bg-surface-50'
                }`}
              >
                {iv}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {trade.netPnl !== undefined && (
              <span className={`font-mono text-sm font-semibold hidden sm:block ${trade.netPnl >= 0 ? 'text-green' : 'text-red'}`}>
                {trade.netPnl >= 0 ? '+' : ''}${trade.netPnl.toFixed(2)}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            >✕</button>
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1 relative min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Loading {trade.instrument} price data…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
              <span className="text-red text-sm">{error}</span>
              <span className="text-gray-500 text-xs">yfinance only has 7 days of 1m data and 60 days of 5m data.</span>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />
        </div>

        {/* Controls */}
        {!loading && !error && bars.length > 0 && (
          <div className="px-4 md:px-5 py-3 border-t border-border space-y-2 shrink-0">
            {/* Status + timestamp */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-500">
                {cur ? new Date(cur.time * 1000).toLocaleString() : ''}
              </span>
              <span className={
                isExited ? 'text-red' :
                isInTrade ? 'text-green' :
                'text-gray-600'
              }>
                {isExited ? '● EXITED' : isInTrade ? '● IN TRADE' : '○ Pre-entry'}
              </span>
            </div>

            {/* Scrub */}
            <input
              type="range"
              min={0}
              max={bars.length - 1}
              value={playIndex}
              onChange={scrub}
              className="w-full h-1 accent-green cursor-pointer"
            />

            {/* Buttons + speed + price legend */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="text-gray-400 hover:text-white transition-colors px-2 text-base"
                  title="Reset"
                >⏮</button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="bg-green text-surface-900 font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-green-500 transition-colors"
                >
                  {playing ? '⏸ Pause' : playIndex >= bars.length - 1 ? '↺ Replay' : '▶ Play'}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Speed</span>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      speed === s
                        ? 'bg-green/20 text-green border border-green/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-gray-500 hidden sm:flex">
                <span>E: <span className="text-green">{trade.entryPrice}</span></span>
                {trade.stopLoss    && <span>SL: <span className="text-red">{trade.stopLoss}</span></span>}
                {trade.targetPrice && <span>TP: <span className="text-amber">{trade.targetPrice}</span></span>}
                {trade.exitPrice   && <span>X: <span className="text-gray-300">{trade.exitPrice}</span></span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
