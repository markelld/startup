module Mutations
  class GenerateOverallReport < Types::BaseMutation
    field :report, Types::ReportType, null: true
    field :errors, [String], null: false

    def resolve
      user = context[:current_user]
      return { report: nil, errors: ["Not authenticated"] } unless user

      accounts = user.accounts
      account = context[:selected_account_id].present? ?
        (accounts.find_by(id: context[:selected_account_id]) || accounts.first) :
        accounts.first
      return { report: nil, errors: ["No account found"] } unless account
      return { report: nil, errors: ["No API key configured"] } if ENV["ANTHROPIC_API_KEY"].blank?

      sections = CoachingService.new.generate_overall_report(account)
      return { report: nil, errors: ["No trading data found"] } unless sections

      report = account.reports.find_or_initialize_by(report_type: :overall)
      report.assign_attributes(
        period_start: account.trading_sessions.minimum(:session_date) || Date.current,
        period_end: Date.current,
        ai_summary: sections[:ai_summary],
        key_insights: sections[:key_insights],
        improvement_areas: sections[:improvement_areas],
        stats_snapshot: {
          total_trades: account.trades.count,
          net_pnl: account.trades.sum(:net_pnl)
        }
      )
      report.save!

      { report: report, errors: [] }
    rescue StandardError => e
      { report: nil, errors: [e.message] }
    end
  end
end
