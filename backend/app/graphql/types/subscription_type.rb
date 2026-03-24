module Types
  class SubscriptionType < Types::BaseObject
    field :trade_synced, Types::TradeType, null: true do
      argument :account_id, ID, required: true
    end

    field :report_generated, Types::ReportType, null: true do
      argument :account_id, ID, required: true
    end

    field :session_updated, Types::TradingSessionType, null: true do
      argument :session_id, ID, required: true
    end

    def trade_synced(account_id:)
      object
    end

    def report_generated(account_id:)
      object
    end

    def session_updated(session_id:)
      object
    end
  end
end
