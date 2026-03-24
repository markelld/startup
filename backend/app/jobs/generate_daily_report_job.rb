class GenerateDailyReportJob
  include Sidekiq::Job

  sidekiq_options queue: :ai, retry: 2

  def perform(account_id, date_str)
    account = Account.find(account_id)
    date    = Date.parse(date_str)
    session = account.trading_sessions.find_by!(session_date: date)

    sections = CoachingService.new.generate_daily_report(session)

    report = account.reports.find_or_initialize_by(
      report_type: :daily,
      period_start: date,
      period_end: date
    )

    report.assign_attributes(
      ai_summary: sections[:ai_summary],
      key_insights: sections[:key_insights],
      improvement_areas: sections[:improvement_areas],
      stats_snapshot: {
        net_pnl: session.net_pnl,
        trade_count: session.trade_count,
        win_rate: session.win_rate,
        profit_factor: session.profit_factor,
        discipline_score: session.discipline_score
      }
    )
    report.save!

    ZoneSchema.subscriptions.trigger(
      "reportGenerated",
      { account_id: account_id },
      report
    )
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error("GenerateDailyReportJob: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("GenerateDailyReportJob error: #{e.message}")
    raise
  end
end
