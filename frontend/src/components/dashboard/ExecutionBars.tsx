interface ExecutionBarsProps {
  entryPrecision?: number
  stopDiscipline?: number
  tradeManagement?: number
  revengeTradeRate?: number
}

function Bar({ label, value, color, sublabel }: { label: string; value: number; color: string; sublabel?: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{label}</span>
          {sublabel && <span className="text-xs text-gray-600">{sublabel}</span>}
        </div>
        <span className="text-xs font-mono text-white">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function ExecutionBars({
  entryPrecision = 0,
  stopDiscipline = 0,
  tradeManagement = 0,
  revengeTradeRate = 0,
}: ExecutionBarsProps) {
  const getColor = (val: number) =>
    val >= 70 ? '#00D49C' : val >= 50 ? '#F5A623' : '#FF4D6A'

  const hasGradedData = entryPrecision > 0 || stopDiscipline > 0 || tradeManagement > 0

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Execution Quality</h3>
        {!hasGradedData && (
          <span className="text-xs text-gray-600">Grade trades to populate</span>
        )}
      </div>

      {hasGradedData ? (
        <>
          <Bar label="Entry Precision"  value={entryPrecision}  color={getColor(entryPrecision)} />
          <Bar label="Stop Discipline"  value={stopDiscipline}  color={getColor(stopDiscipline)} />
          <Bar label="Trade Management" value={tradeManagement} color={getColor(tradeManagement)} />
        </>
      ) : (
        <div className="py-4 text-center space-y-1">
          <p className="text-xs text-gray-600">No graded trades yet</p>
          <p className="text-xs text-gray-700">Go to the Grade tab and run ✦ Grade Day on a session</p>
        </div>
      )}

      <div className={hasGradedData ? 'pt-1 border-t border-border' : ''}>
        <Bar
          label="Revenge Trades"
          value={revengeTradeRate}
          sublabel="(lower is better)"
          color={revengeTradeRate < 20 ? '#00D49C' : revengeTradeRate < 40 ? '#F5A623' : '#FF4D6A'}
        />
      </div>
    </div>
  )
}
