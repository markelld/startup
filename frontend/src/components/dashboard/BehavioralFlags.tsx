interface BehavioralFlagsProps {
  flags: string[]
  violations?: Array<{ ruleType: string; description: string; severity: number }>
  revengeTradeRate?: number
  totalTrades?: number
}

const FLAG_ICONS: Record<string, string> = {
  REVENGE_TRADING: '⚠️',
  OVERTRADING: '📈',
  HIGH_REVENGE_TRADING: '🔴',
  FREQUENT_OVERTRADING: '🔴',
}

export default function BehavioralFlags({ flags, violations = [], revengeTradeRate = 0, totalTrades = 0 }: BehavioralFlagsProps) {
  const hasIssues = flags.length > 0 || violations.length > 0

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Behavioral Flags</h3>

      <div className="space-y-2">
        {/* Always show revenge trade stat */}
        <div className="flex items-center justify-between py-1 border-b border-border">
          <span className="text-xs text-gray-400">Revenge trades</span>
          <span className={`text-xs font-mono font-semibold ${revengeTradeRate > 15 ? 'text-red' : revengeTradeRate > 0 ? 'text-amber' : 'text-green'}`}>
            {revengeTradeRate.toFixed(1)}%
          </span>
        </div>

        {/* Flags */}
        {flags.map((flag, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span>{FLAG_ICONS[flag] || '⚠️'}</span>
            <span className="text-amber text-xs">{flag.replace(/_/g, ' ')}</span>
          </div>
        ))}

        {/* Rule violations */}
        {violations.map((v, i) => (
          <div key={i} className="p-2 bg-red/5 border border-red/20 rounded-lg">
            <p className="text-xs text-red font-medium uppercase">{v.ruleType.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-300 mt-0.5">{v.description}</p>
          </div>
        ))}

        {!hasIssues && totalTrades > 0 && (
          <div className="flex items-center gap-2 text-green text-xs pt-1">
            <span>✅</span>
            <span>No rule violations detected</span>
          </div>
        )}

        {totalTrades === 0 && (
          <p className="text-xs text-gray-600">No trades recorded yet</p>
        )}
      </div>
    </div>
  )
}
