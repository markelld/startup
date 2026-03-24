module Types
  class TradingSessionType < Types::BaseObject
    field :id, ID, null: false
    field :session_date, GraphQL::Types::ISO8601Date, null: false
    field :market_session, String
    field :net_pnl, Float
    field :discipline_score, Float
    field :analytics_payload, GraphQL::Types::JSON
    field :win_rate, Float
    field :profit_factor, Float
    field :trade_count, Integer
    field :trades, [Types::TradeType], null: false
    field :rule_violations, [Types::RuleViolationType], null: false

    def trades
      object.trades.order(entered_at: :asc)
    end

    def win_rate
      object.win_rate
    end

    def profit_factor
      object.profit_factor
    end

    def trade_count
      object.trade_count
    end
  end
end
