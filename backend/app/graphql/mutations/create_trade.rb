module Mutations
  class CreateTrade < Types::BaseMutation
    POINT_VALUES = {
      'MNQ' => 2.0, 'NQ' => 20.0, 'MES' => 5.0, 'ES' => 50.0,
      'MYM' => 0.50, 'YM' => 5.0, 'MGC' => 10.0, 'GC' => 100.0,
      'MCL' => 100.0, 'CL' => 1000.0
    }.freeze

    argument :instrument, String, required: true
    argument :side, String, required: true
    argument :quantity, Integer, required: true
    argument :entry_price, Float, required: true
    argument :exit_price, Float, required: false
    argument :stop_loss, Float, required: false
    argument :target_price, Float, required: false
    argument :net_pnl, Float, required: false
    argument :entered_at, GraphQL::Types::ISO8601DateTime, required: false
    argument :exited_at, GraphQL::Types::ISO8601DateTime, required: false
    argument :notes, String, required: false
    argument :emotion, String, required: false
    argument :session_date, GraphQL::Types::ISO8601Date, required: false

    field :trade, Types::TradeType, null: true
    field :errors, [String], null: false

    def resolve(instrument:, side:, quantity:, entry_price:, exit_price: nil,
                stop_loss: nil, target_price: nil, net_pnl: nil, entered_at: nil, exited_at: nil,
                notes: nil, emotion: nil, session_date: nil)
      user = context[:current_user]
      return { trade: nil, errors: ['Not authenticated'] } unless user

      account = user.accounts.find_by(id: context[:selected_account_id]) || user.accounts.first
      return { trade: nil, errors: ['No account found'] } unless account

      date = session_date || entered_at&.to_date || Date.current

      session = account.trading_sessions.find_or_create_by!(session_date: date) do |s|
        s.market_session = 0
        s.net_pnl = 0
        s.discipline_score = 0
      end

      calculated_pnl = net_pnl
      if calculated_pnl.nil? && exit_price
        base = instrument.gsub(/[A-Z]\d+$/, '')
        pv = POINT_VALUES[base] || 1.0
        direction = side == 'long' ? 1 : -1
        calculated_pnl = (exit_price - entry_price) * quantity * pv * direction
      end

      trade = Trade.new(
        trading_session: session,
        account: account,
        broker_trade_id: "manual-#{SecureRandom.hex(8)}",
        instrument: instrument.upcase,
        side: side,
        quantity: quantity,
        entry_price: entry_price,
        exit_price: exit_price,
        stop_loss: stop_loss,
        target_price: target_price,
        net_pnl: calculated_pnl || 0,
        entered_at: entered_at || Time.current,
        exited_at: exited_at,
        notes: notes,
        emotion: emotion,
        status: exit_price ? :closed : :open
      )

      if trade.save
        session.update_column(:net_pnl, session.trades.sum(:net_pnl))
        { trade: trade, errors: [] }
      else
        { trade: nil, errors: trade.errors.full_messages }
      end
    end
  end
end
