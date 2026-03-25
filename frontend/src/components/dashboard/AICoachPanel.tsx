import { useMutation, useQuery } from '@apollo/client'
import { GENERATE_OVERALL_REPORT } from '../../lib/graphql/mutations'
import { LIST_REPORTS } from '../../lib/graphql/queries'
import { format, getDay, endOfMonth, endOfYear, addDays } from 'date-fns'

function nextRefreshDate(now: Date): Date {
  // Next Friday
  const day = getDay(now) // 0=Sun, 5=Fri
  const daysUntilFriday = day <= 5 ? 5 - day : 6 // days until next Friday
  const nextFriday = addDays(now, daysUntilFriday === 0 ? 7 : daysUntilFriday)

  const monthEnd = endOfMonth(now)
  const yearEnd = endOfYear(now)

  // Return the soonest upcoming window
  return [nextFriday, monthEnd, yearEnd].sort((a, b) => a.getTime() - b.getTime())[0]
}

function canRefresh(now: Date): boolean {
  const day = getDay(now)
  const isFriday = day === 5
  const lastDayOfMonth = endOfMonth(now).getDate() === now.getDate()
  const lastDayOfYear = now.getMonth() === 11 && lastDayOfMonth
  return isFriday || lastDayOfMonth || lastDayOfYear
}

export default function AICoachPanel() {
  const { data, refetch } = useQuery(LIST_REPORTS, {
    variables: { limit: 1, type: 'overall' },
  })

  const [generateReport, { loading }] = useMutation(GENERATE_OVERALL_REPORT, {
    onCompleted: () => refetch(),
  })

  const report = data?.reports?.[0]
  const now = new Date()
  const refreshAllowed = canRefresh(now)
  const nextRefresh = format(nextRefreshDate(now), 'MMM d')

  if (!report) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-8 text-center">
        {refreshAllowed ? (
          <>
            <p className="text-gray-400 text-sm">No coaching report yet</p>
            <button
              onClick={() => generateReport()}
              disabled={loading}
              className="btn-primary text-sm"
            >
              {loading ? 'Analyzing your account…' : '✦ Generate Coaching Report'}
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm">No coaching report yet</p>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              Your first coaching report will be available at the end of this trading week —{' '}
              <span className="text-white">{nextRefresh}</span>.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">AI Coach</h3>
        {refreshAllowed ? (
          <button
            onClick={() => generateReport()}
            disabled={loading}
            className="text-xs text-green hover:underline"
          >
            {loading ? 'Analyzing…' : 'Refresh'}
          </button>
        ) : (
          <span className="text-xs text-gray-500">Next refresh {nextRefresh}</span>
        )}
      </div>

      {report.aiSummary && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Summary</p>
          <p className="text-sm text-gray-200 leading-relaxed">{report.aiSummary}</p>
        </div>
      )}

      {report.keyInsights && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Key Insights</p>
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
            {report.keyInsights}
          </div>
        </div>
      )}

      {report.improvementAreas && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Actions</p>
          <div className="text-sm text-green leading-relaxed whitespace-pre-line">
            {report.improvementAreas}
          </div>
        </div>
      )}
    </div>
  )
}
