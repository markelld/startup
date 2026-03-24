module Mutations
  class GeneratePeriodReport < Types::BaseMutation
    argument :period_type, String, required: true   # weekly, monthly, yearly
    argument :period_start, GraphQL::Types::ISO8601Date, required: true

    field :report, Types::ReportType, null: true
    field :errors, [String], null: false

    def resolve(period_type:, period_start:)
      user = context[:current_user]
      return { report: nil, errors: ["Not authenticated"] } unless user

      account = context[:selected_account_id].present? ?
        (user.accounts.find_by(id: context[:selected_account_id]) || user.accounts.first) :
        user.accounts.first
      return { report: nil, errors: ["No account found"] } unless account
      return { report: nil, errors: ["No API key configured"] } if ENV["ANTHROPIC_API_KEY"].blank?
      return { report: nil, errors: ["Invalid period type"] } unless %w[weekly monthly yearly].include?(period_type)

      result = CoachingService.new.generate_period_report(account, period_type, period_start)
      return { report: nil, errors: ["No trading data found for this period"] } unless result

      report = account.reports.find_or_initialize_by(
        report_type: period_type,
        period_start: result[:period_start]
      )
      report.assign_attributes(
        period_end: result[:period_end],
        ai_summary: result[:ai_summary],
        key_insights: result[:key_insights],
        improvement_areas: result[:improvement_areas],
        stats_snapshot: result[:stats]
      )
      report.save!

      { report: report, errors: [] }
    rescue StandardError => e
      { report: nil, errors: [e.message] }
    end
  end
end
