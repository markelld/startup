module Types
  class RuleViolationType < Types::BaseObject
    field :id, ID, null: false
    field :rule_type, String, null: false
    field :description, String
    field :severity, Float
    field :impact_pnl, Float
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
