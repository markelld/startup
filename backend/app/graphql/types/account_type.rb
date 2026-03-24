module Types
  class AccountType < Types::BaseObject
    field :id, ID, null: false
    field :name, String
    field :account_type, String
    field :firm_name, String
    field :balance, Float
    field :buying_power, Float
    field :commission_per_contract, Float
    field :current_balance, Float, null: false
    field :percent_return, Float, null: false
    field :rules, GraphQL::Types::JSON
    field :daily_pnl, Float
    field :trading_sessions, [Types::TradingSessionType], null: false

    # Overall account stats
    field :total_pnl, Float, null: false
    field :total_trades, Integer, null: false
    field :trading_days, Integer, null: false
    field :first_session_date, String, null: true
    field :win_rate, Float, null: false
    field :profit_factor, Float, null: false
    field :avg_day_pnl, Float, null: false
    field :best_day_pnl, Float, null: false
    field :worst_day_pnl, Float, null: false
    field :recent_trades, [Types::TradeType], null: false

    # Analytics fields
    field :avg_discipline_score, Float, null: false
    field :entry_precision, Float, null: false
    field :stop_discipline, Float, null: false
    field :trade_management, Float, null: false
    field :revenge_trade_rate, Float, null: false
    field :recent_violations, GraphQL::Types::JSON, null: false

    def daily_pnl
      object.daily_pnl(Date.current)
    end

    def trading_sessions
      object.trading_sessions.order(session_date: :desc).limit(30)
    end

    def total_pnl
      object.trades.where(status: :closed).sum(:net_pnl).to_f
    end

    def current_balance
      (object.balance.to_f + total_pnl).round(2)
    end

    def percent_return
      starting = object.balance.to_f
      return 0.0 if starting.zero?
      (total_pnl / starting * 100).round(2)
    end

    def total_trades
      object.trades.where(status: :closed).count
    end

    def trading_days
      object.trading_sessions.count
    end

    def first_session_date
      object.trading_sessions.minimum(:session_date)&.to_s
    end

    def win_rate
      closed = object.trades.where(status: :closed)
      return 0.0 if closed.empty?
      (closed.where('net_pnl > 0').count.to_f / closed.count * 100).round(1)
    end

    def profit_factor
      closed = object.trades.where(status: :closed)
      gross_profit = closed.where('net_pnl > 0').sum(:net_pnl).to_f
      gross_loss   = closed.where('net_pnl < 0').sum(:net_pnl).abs.to_f
      return 0.0 if gross_loss.zero?
      (gross_profit / gross_loss).round(2)
    end

    def avg_day_pnl
      # Derive from trades directly so it stays consistent with total_pnl
      days = object.trading_sessions.count
      return 0.0 if days.zero?
      (object.trades.where(status: :closed).sum(:net_pnl).to_f / days).round(2)
    end

    def best_day_pnl
      object.trading_sessions.maximum(:net_pnl)&.to_f || 0.0
    end

    def worst_day_pnl
      object.trading_sessions.minimum(:net_pnl)&.to_f || 0.0
    end

    def recent_trades
      object.trades.where(status: :closed).order(entered_at: :desc).limit(10)
    end

    def avg_discipline_score
      graded = object.trades.where.not(composite_score: nil)
      return 0.0 if graded.empty?
      graded.average(:composite_score).to_f.round(1)
    end

    def entry_precision
      graded = object.trades.where.not(entry_score: nil)
      return 0.0 if graded.empty?
      graded.average(:entry_score).to_f.round(1)
    end

    def stop_discipline
      graded = object.trades.where.not(risk_score: nil)
      return 0.0 if graded.empty?
      graded.average(:risk_score).to_f.round(1)
    end

    def trade_management
      graded = object.trades.where.not(mgmt_score: nil)
      return 0.0 if graded.empty?
      graded.average(:mgmt_score).to_f.round(1)
    end

    def revenge_trade_rate
      closed = object.trades.where(status: :closed)
      return 0.0 if closed.empty?
      (closed.where(is_revenge_trade: true).count.to_f / closed.count * 100).round(1)
    end

    def recent_violations
      object.trading_sessions.order(session_date: :desc).limit(7)
        .flat_map { |s| s.rule_violations.map { |v| { rule_type: v.rule_type, description: v.description, severity: v.severity } } }
        .first(5)
    end
  end
end
