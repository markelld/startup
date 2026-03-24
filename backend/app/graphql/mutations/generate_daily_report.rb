module Mutations
  class GenerateDailyReport < Types::BaseMutation
    argument :date, GraphQL::Types::ISO8601Date, required: false

    field :report, Types::ReportType, null: true
    field :errors, [String], null: false

    def resolve(date: Date.current)
      user = context[:current_user]
      return { report: nil, errors: ["Not authenticated"] } unless user

      accounts = user.accounts
      account = context[:selected_account_id].present? ?
        (accounts.find_by(id: context[:selected_account_id]) || accounts.first) :
        accounts.first
      return { report: nil, errors: ["No account found"] } unless account

      session = account.trading_sessions.find_by(session_date: date)
      return { report: nil, errors: ["No session found for #{date}"] } unless session

      return { report: nil, errors: ["No API key configured"] } if ENV["ANTHROPIC_API_KEY"].blank?

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

      { report: report, errors: [] }
    rescue StandardError => e
      { report: nil, errors: [e.message] }
    end
  end
end
