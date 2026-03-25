module Mutations
  class DeleteTrade < Types::BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      return { success: false, errors: ['Not authenticated'] } unless user

      trade = user.accounts.includes(:trades).flat_map(&:trades).find { |t| t.id.to_s == id.to_s }
      return { success: false, errors: ['Trade not found'] } unless trade

      session = trade.trading_session
      if trade.destroy
        session&.update_column(:net_pnl, session.trades.where(status: :closed).sum(:net_pnl))
        { success: true, errors: [] }
      else
        { success: false, errors: trade.errors.full_messages }
      end
    end
  end
end
