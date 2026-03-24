module Types
  class TradeType < Types::BaseObject
    field :id, ID, null: false
    field :broker_trade_id, String, null: false
    field :instrument, String
    field :side, String
    field :quantity, Integer
    field :entry_price, Float
    field :exit_price, Float
    field :stop_loss, Float
    field :target_price, Float
    field :net_pnl, Float
    field :grade, String
    field :is_revenge_trade, Boolean
    field :emotion, String
    field :screenshot_url, String
    field :r_multiple, Float
    field :duration_minutes, Integer
    field :entered_at, GraphQL::Types::ISO8601DateTime
    field :exited_at, GraphQL::Types::ISO8601DateTime
    field :status, String
    field :notes, String
    field :setup_score, Float
    field :entry_score, Float
    field :risk_score, Float
    field :mgmt_score, Float
    field :coaching_notes, String
    field :composite_score, Float
    field :off_playbook, Boolean

    def composite_score
      object.composite_score
    end
  end
end
