module Types
  class QueryType < Types::BaseObject
    field :me, Types::UserType, null: true,
      description: "The currently authenticated user"

    field :my_trading_plan, Types::TradingPlanType, null: true,
      description: "The current user's trading plan"

    field :current_account, Types::AccountType, null: true,
      description: "The current user's primary account"

    field :accounts, [Types::AccountType], null: false,
      description: "All accounts belonging to the current user"

    field :trading_session, Types::TradingSessionType, null: true do
      argument :date, GraphQL::Types::ISO8601Date, required: false
    end

    field :trades, [Types::TradeType], null: false do
      argument :session_id, ID, required: false
      argument :date, GraphQL::Types::ISO8601Date, required: false
      argument :limit, Integer, required: false, default_value: 20
      argument :offset, Integer, required: false, default_value: 0
    end

    field :trade, Types::TradeType, null: true do
      argument :id, ID, required: true
    end

    field :reports, [Types::ReportType], null: false do
      argument :type, String, required: false
      argument :limit, Integer, required: false, default_value: 10
    end

    field :weekly_report, Types::ReportType, null: true do
      argument :week_of, GraphQL::Types::ISO8601Date, required: true
    end

    field :session_analytics, Types::AnalyticsType, null: true do
      argument :id, ID, required: true
    end

    def me
      context[:current_user]
    end

    def my_trading_plan
      context[:current_user]&.trading_plan
    end

    def current_account
      return nil unless context[:current_user]
      accounts = context[:current_user].accounts
      if context[:selected_account_id].present?
        accounts.find_by(id: context[:selected_account_id]) || accounts.first
      else
        accounts.first
      end
    end

    def accounts
      return [] unless context[:current_user]
      context[:current_user].accounts.order(created_at: :asc)
    end

    def trading_session(date: Date.current)
      account = current_account
      return nil unless account
      account.trading_sessions.find_by(session_date: date)
    end

    def trades(session_id: nil, date: nil, limit: 20, offset: 0)
      account = current_account
      return [] unless account

      if session_id
        session = account.trading_sessions.find(session_id)
        session.trades.order(entered_at: :asc)
      elsif date
        session = account.trading_sessions.find_by(session_date: date)
        session&.trades&.order(entered_at: :asc) || []
      else
        account.trades.where(status: :closed).order(entered_at: :desc).limit(limit).offset(offset)
      end
    end

    def trade(id:)
      account = current_account
      return nil unless account
      account.trades.find(id)
    end

    def reports(type: nil, limit: 10)
      account = current_account
      return [] unless account
      scope = account.reports.order(period_start: :desc).limit(limit)
      type ? scope.where(report_type: type) : scope
    end

    def weekly_report(week_of:)
      account = current_account
      return nil unless account
      account.reports.weekly.find_by(period_start: week_of.beginning_of_week)
    end

    def session_analytics(id:)
      account = current_account
      return nil unless account
      session = account.trading_sessions.find(id)
      payload = session.analytics_payload
      return nil if payload.blank?
      OpenStruct.new(
        discipline_score: payload["discipline_score"],
        entry_precision: payload["entry_precision"],
        stop_discipline: payload["stop_discipline"],
        trade_management: payload["trade_management"],
        early_exit_rate: payload["early_exit_rate"],
        revenge_trade_count: payload["revenge_trade_count"],
        behavioral_flags: payload["behavioral_flags"] || [],
        time_of_day_breakdown: payload["time_of_day_breakdown"],
        r_distribution: payload["r_distribution"] || []
      )
    end

    field :week_sessions, [Types::TradingSessionType], null: false do
      argument :week_of, GraphQL::Types::ISO8601Date, required: true
    end

    def week_sessions(week_of:)
      account = current_account
      return [] unless account
      account.trading_sessions
        .where(session_date: week_of.beginning_of_week..week_of.end_of_week)
        .order(session_date: :asc)
    end

    field :month_sessions, [Types::TradingSessionType], null: false do
      argument :year, Integer, required: true
      argument :month, Integer, required: true
    end

    def month_sessions(year:, month:)
      account = current_account
      return [] unless account
      start_date = Date.new(year, month, 1)
      end_date = start_date.end_of_month
      account.trading_sessions
        .where(session_date: start_date..end_date)
        .order(session_date: :asc)
    end
  end
end
