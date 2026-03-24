import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface SessionBreakdownProps {
  sessions?: Array<{
    sessionDate: string
    netPnl: number
    tradeCount: number
  }>
}

export default function SessionBreakdown({ sessions = [] }: SessionBreakdownProps) {
  const data = sessions.slice(0, 10).map((s) => ({
    date: s.sessionDate?.slice(5),
    pnl: s.netPnl,
  }))

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Sessions</h3>
      {data.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-6">No sessions yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: '#6B7280' }} width={55} />
            <Tooltip
              contentStyle={{ background: '#1A1A24', border: '1px solid #2A2A3A', borderRadius: 8 }}
              formatter={(val) => typeof val === 'number' ? `$${val.toFixed(2)}` : String(val)}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? '#00D49C' : '#FF4D6A'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
