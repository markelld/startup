import { useEffect, useRef, useState } from 'react'

const SYMBOLS = [
  { label: 'ES', value: 'CME_MINI:ES1!' },
  { label: 'NQ', value: 'CME_MINI:NQ1!' },
  { label: 'MES', value: 'CME_MICRO:MES1!' },
  { label: 'MNQ', value: 'CME_MICRO:MNQ1!' },
  { label: 'RTY', value: 'CME_MINI:RTY1!' },
  { label: 'CL', value: 'NYMEX:CL1!' },
  { label: 'GC', value: 'COMEX:GC1!' },
]

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '3m', value: '3' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1h', value: '60' },
  { label: 'D', value: 'D' },
]

export default function MarketChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [symbol, setSymbol] = useState(SYMBOLS[0].value)
  const [interval, setInterval] = useState('5')

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.height = '100%'
    wrapper.style.width = '100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = '100%'
    inner.style.width = '100%'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: 'rgba(10, 10, 15, 1)',
      gridColor: 'rgba(255, 255, 255, 0.04)',
    })

    wrapper.appendChild(inner)
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)
  }, [symbol, interval])

  return (
    <div className="card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-gray-400">Symbol</span>
        <div className="flex gap-1">
          {SYMBOLS.map(s => (
            <button
              key={s.value}
              onClick={() => setSymbol(s.value)}
              className={`text-xs px-2 py-1 rounded font-mono transition-colors ${
                symbol === s.value
                  ? 'bg-green/15 text-green border border-green/30'
                  : 'text-gray-400 hover:text-white hover:bg-surface-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex gap-1">
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                interval === iv.value
                  ? 'bg-blue/15 text-blue border border-blue/30'
                  : 'text-gray-400 hover:text-white hover:bg-surface-50'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="h-[420px] w-full" />
    </div>
  )
}
