class GenerateWeeklyReportJob
  include Sidekiq::Job

  sidekiq_options queue: :ai, retry: 2

  def perform(account_id, week_start_str)
    account    = Account.find(account_id)
    week_start = Date.parse(week_start_str)
    week_end   = week_start + 4  # Mon–Fri

    sessions = account.trading_sessions
      .where(session_date: week_start..week_end)
      .order(:session_date)
      .includes(:trades, :rule_violations)

    return if sessions.empty?

    sections = CoachingService.new.generate_weekly_summary(sessions)

    report = account.reports.find_or_initialize_by(
      report_type: :weekly,
      period_start: week_start,
      period_end: week_end
    )

    all_trades = sessions.flat_map { |s| s.trades.where(status: :closed) }
    winners = all_trades.select { |t| t.net_pnl.to_f > 0 }

    report.assign_attributes(
      ai_summary: sections[:ai_summary],
      key_insights: sections[:key_insights],
      improvement_areas: sections[:improvement_areas],
      stats_snapshot: {
        total_pnl: sessions.sum(&:net_pnl),
        total_trades: all_trades.count,
        win_rate: all_trades.empty? ? 0 : (winners.count.to_f / all_trades.count * 100).round(1),
        sessions_count: sessions.count
      }
    )
    report.save!

    ZoneSchema.subscriptions.trigger(
      "reportGenerated",
      { account_id: account_id },
      report
    )
  rescue StandardError => e
    Rails.logger.error("GenerateWeeklyReportJob error: #{e.message}")
    raise
  end
end
