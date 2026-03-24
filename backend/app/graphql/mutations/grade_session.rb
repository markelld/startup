module Mutations
  class GradeSession < Types::BaseMutation
    argument :date, GraphQL::Types::ISO8601Date, required: true

    field :trades, [Types::TradeType], null: false
    field :errors, [String], null: false

    def resolve(date:)
      user = context[:current_user]
      return { trades: [], errors: ["Not authenticated"] } unless user

      account = context[:selected_account_id].present? ?
        (user.accounts.find_by(id: context[:selected_account_id]) || user.accounts.first) :
        user.accounts.first
      return { trades: [], errors: ["No account found"] } unless account
      return { trades: [], errors: ["No API key configured"] } if ENV["ANTHROPIC_API_KEY"].blank?

      session = account.trading_sessions.find_by(session_date: date)
      return { trades: [], errors: ["No session found for #{date}"] } unless session

      trades = session.trades.where(status: :closed)
      return { trades: [], errors: ["No closed trades on this day"] } if trades.empty?

      # Block regrading — only grade ungraded trades
      ungraded = trades.where(grade: nil)
      return { trades: trades.to_a, errors: ["All trades already graded"] } if ungraded.empty?

      trading_plan = user.trading_plan
      results = CoachingService.new.grade_trades_batch(ungraded.to_a, trading_plan: trading_plan)
      return { trades: [], errors: ["Failed to get grades from AI"] } if results.empty?

      results.each do |r|
        trade = ungraded.find { |t| t.id.to_s == r["trade_id"].to_s }
        next unless trade
        trade.update!(
          grade: r["grade"],
          setup_score: r["setup_score"],
          entry_score: r["entry_score"],
          risk_score: r["risk_score"],
          mgmt_score: r["mgmt_score"],
          composite_score: r["composite_score"],
          coaching_notes: r["coaching_notes"],
          off_playbook: r["off_playbook"] || false
        )
      end

      { trades: session.trades.where(status: :closed).to_a, errors: [] }
    rescue StandardError => e
      { trades: [], errors: [e.message] }
    end
  end
end
