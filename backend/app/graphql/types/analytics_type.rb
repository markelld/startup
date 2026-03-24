module Types
  class AnalyticsType < Types::BaseObject
    field :discipline_score, Float
    field :entry_precision, Float
    field :stop_discipline, Float
    field :trade_management, Float
    field :early_exit_rate, Float
    field :revenge_trade_count, Integer
    field :behavioral_flags, [String], null: false
    field :time_of_day_breakdown, GraphQL::Types::JSON
    field :r_distribution, [Float], null: false
  end
end
