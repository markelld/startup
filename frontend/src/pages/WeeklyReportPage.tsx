import { useState, useEffect } from 'react'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import {
  format, parseISO,
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  startOfYear, endOfYear, subYears,
  eachWeekOfInterval, eachMonthOfInterval,
  addDays, endOfDay, isAfter, addMonths, addYears,
} from 'date-fns'
import { LIST_REPORTS, CURRENT_ACCOUNT } from '../lib/graphql/queries'
import { GENERATE_PERIOD_REPORT } from '../lib/graphql/mutations'
import { useAccountStore } from '../stores/accountStore'

type Tab = 'weekly' | 'monthly' | 'yearly'

function ReportCard({ report, onRegenerate, generating }: { report: any; onRegenerate: () => void; generating: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const snap = report.statsSnapshot || {}

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{report.reportType} Report</p>
          <p className="text-sm font-medium text-white mt-0.5">
            {format(parseISO(report.periodStart), 'MMM d')} – {format(parseISO(report.periodEnd), 'MMM d, yyyy')}
          </p>
          {snap.session_count !== undefined && (
            <p className="text-xs text-gray-500 mt-0.5">
              {snap.session_count} sessions · {snap.trade_count} trades
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {snap.net_pnl !== undefined && (
            <span className={`font-mono text-sm font-semibold ${snap.net_pnl >= 0 ? 'text-green' : 'text-red'}`}>
              {snap.net_pnl >= 0 ? '+' : ''}${Number(snap.net_pnl).toFixed(2)}
            </span>
          )}
          <button
            onClick={onRegenerate}
            disabled={generating}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            ↺
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-blue hover:underline">
            {expanded ? 'Collapse' : 'Read'}
          </button>
        </div>
      </div>

      {snap.win_rate !== undefined && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span>{Number(snap.win_rate).toFixed(1)}% WR</span>
          {snap.profit_factor !== undefined && <span>{Number(snap.profit_factor).toFixed(2)} PF</span>}
          {snap.avg_discipline !== undefined && snap.avg_discipline !== 'N/A' && (
            <span>{Number(snap.avg_discipline).toFixed(0)}/100 discipline</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          {report.aiSummary && (
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-wide mb-1.5">Summary</p>
              <p className="text-sm text-gray-200 leading-relaxed">{report.aiSummary}</p>
            </div>
          )}
          {report.keyInsights && (
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-wide mb-1.5">Key Insights</p>
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{report.keyInsights}</div>
            </div>
          )}
          {report.improvementAreas && (
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-wide mb-1.5">Actions</p>
              <div className="text-sm text-green leading-relaxed whitespace-pre-line">{report.improvementAreas}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyPeriodRow({ label, sublabel, onGenerate, generating }: {
  label: string; sublabel?: string; onGenerate: () => void; generating: boolean
}) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-60"
      >
        {generating ? (
          <>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Analyzing…
          </>
        ) : '✦ Generate Report'}
      </button>
    </div>
  )
}

export default function WeeklyReportPage() {
  const { account } = useAccountStore()
  const apolloClient = useApolloClient()
  const [tab, setTab] = useState<Tab>('weekly')
  const [generatingKey, setGeneratingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [firstSessionDate, setFirstSessionDate] = useState<Date | null>(null)

  useEffect(() => {
    if (!account) return
    apolloClient.query({ query: CURRENT_ACCOUNT, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const d = data?.currentAccount?.firstSessionDate
        if (d) setFirstSessionDate(new Date(d))
      }).catch(() => {})
  }, [account, apolloClient])

  const { data: reportsData, refetch } = useQuery(LIST_REPORTS, {
    variables: { limit: 60 },
    skip: !account,
  })

  const [generateReport] = useMutation(GENERATE_PERIOD_REPORT, {
    onCompleted: (data) => {
      setGeneratingKey(null)
      if (data.generatePeriodReport.errors?.length > 0) {
        setErrors(data.generatePeriodReport.errors)
      } else {
        setErrors([])
        refetch()
      }
    },
    onError: (e) => { setErrors([e.message]); setGeneratingKey(null) },
  })

  const reports: any[] = reportsData?.reports || []
  const reportMap: Record<string, any> = {}
  reports.forEach(r => { reportMap[`${r.reportType}:${r.periodStart}`] = r })

  const now = new Date()

  const handleGenerate = (periodType: Tab, periodStart: string) => {
    const key = `${periodType}:${periodStart}`
    setGeneratingKey(key)
    setErrors([])
    generateReport({ variables: { periodType, periodStart } })
  }

  const cutoff = firstSessionDate ?? null

  // ── Week periods: up to 52 weeks, filtered to account history ──────────────
  const weekPeriods = Array.from({ length: 52 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 4) // Friday
    return { start: weekStart, end: weekEnd }
  }).filter(({ end }) => !cutoff || end >= cutoff)

  // ── Month periods: up to 24 months, filtered to account history ────────────
  const monthPeriods = Array.from({ length: 24 }, (_, i) => {
    const d = subMonths(now, i)
    return { start: startOfMonth(d), end: endOfMonth(d) }
  }).filter(({ end }) => !cutoff || end >= cutoff)

  // ── Year periods: up to 5 years, filtered to account history ──────────────
  const yearPeriods = Array.from({ length: 5 }, (_, i) => {
    const d = subYears(now, i)
    return { start: startOfYear(d), end: endOfYear(d) }
  }).filter(({ end }) => !cutoff || end >= cutoff)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'yearly', label: 'Year' },
  ]

  const renderPeriods = () => {
    const periods = tab === 'weekly' ? weekPeriods : tab === 'monthly' ? monthPeriods : yearPeriods

    return periods.map(({ start, end }) => {
      const periodStart = format(start, 'yyyy-MM-dd')
      const key = `${tab}:${periodStart}`
      const report = reportMap[key]
      const isGenerating = generatingKey === key

      const label = tab === 'weekly'
        ? `${format(start, 'MMM d')} – ${format(addDays(start, 4), 'MMM d, yyyy')}`
        : tab === 'monthly'
        ? format(start, 'MMMM yyyy')
        : format(start, 'yyyy')

      // Unlock dates: weekly → after Friday EOD, monthly → after last day of month, yearly → after Dec 31
      const unlockDate = tab === 'weekly'
        ? endOfDay(addDays(start, 4))          // Friday EOD
        : tab === 'monthly'
        ? endOfMonth(start)                    // last day of month EOD
        : endOfYear(start)                     // Dec 31 EOD

      const unlocked = isAfter(now, unlockDate)

      const availableOn = tab === 'weekly'
        ? `Available after ${format(addDays(start, 4), 'MMM d')}`
        : tab === 'monthly'
        ? `Available ${format(addMonths(start, 1), 'MMM 1')}`
        : `Available ${format(addYears(start, 1), 'yyyy')}`

      if (report) {
        return (
          <ReportCard
            key={key}
            report={report}
            generating={isGenerating}
            onRegenerate={() => handleGenerate(tab, periodStart)}
          />
        )
      }

      if (!unlocked) {
        return (
          <div key={key} className="card flex items-center justify-between opacity-50 cursor-default">
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">In progress</p>
            </div>
            <span className="text-xs text-gray-500">{availableOn}</span>
          </div>
        )
      }

      return (
        <EmptyPeriodRow
          key={key}
          label={label}
          onGenerate={() => handleGenerate(tab, periodStart)}
          generating={isGenerating}
        />
      )
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">AI Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">AI-powered coaching by time period</p>
      </div>

      {/* Journal nudge */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-green/5 border border-green/20">
        <span className="text-green mt-0.5 shrink-0">✦</span>
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-green font-medium">Better reports start with better context.</span>{' '}
          Open any trade from the Journal or Dashboard and add notes & emotion — the AI uses them to give you more accurate, personalized coaching.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-surface-100 border border-border rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-green text-surface-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="card border-red/30 bg-red/5 text-red text-sm space-y-1">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <div className="space-y-3">
        {renderPeriods()}
      </div>
    </div>
  )
}
