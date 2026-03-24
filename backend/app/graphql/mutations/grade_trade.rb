module Mutations
  class GradeTrade < Types::BaseMutation
    argument :id, ID, required: true

    field :trade, Types::TradeType, null: true
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      return { trade: nil, errors: ["Not authenticated"] } unless user

      trade = user.accounts.flat_map { |a| a.trades }.find { |t| t.id.to_s == id }
      return { trade: nil, errors: ["Trade not found"] } unless trade
      return { trade: nil, errors: ["No API key configured"] } if ENV["ANTHROPIC_API_KEY"].blank?

      result = CoachingService.new.grade_trade(trade, trading_plan: user.trading_plan)
      trade.update!(
        grade: result["grade"],
        setup_score: result["setup_score"],
        entry_score: result["entry_score"],
        risk_score: result["risk_score"],
        mgmt_score: result["mgmt_score"],
        composite_score: result["composite_score"],
        coaching_notes: result["coaching_notes"],
        off_playbook: result["off_playbook"] || false
      )
      { trade: trade, errors: [] }
    rescue StandardError => e
      { trade: nil, errors: [e.message] }
    end
  end
end
