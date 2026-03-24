import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface Trade {
  enteredAt: string
  netPnl: number
}

interface EquityCurveProps {
  trades: Trade[]
}

export default function EquityCurve({ trades }: EquityCurveProps) {
  let cumulative = 0
  const data = trades.map((trade, i) => {
    cumulative += trade.netPnl || 0
    return {
      index: i + 1,
      pnl: trade.netPnl,
      cumulative: parseFloat(cumulative.toFixed(2)),
    }
  })

  const isPositive = cumulative >= 0

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Equity Curve</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#00D49C' : '#FF4D6A'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#00D49C' : '#FF4D6A'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            width={55}
          />
          <Tooltip
            contentStyle={{ background: '#1A1A24', border: '1px solid #2A2A3A', borderRadius: 8 }}
            labelFormatter={(i) => `Trade ${i}`}
            formatter={(val) => typeof val === 'number' ? `$${val.toFixed(2)}` : String(val)}
          />
          <ReferenceLine y={0} stroke="#2A2A3A" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={isPositive ? '#00D49C' : '#FF4D6A'}
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
