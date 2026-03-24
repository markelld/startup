module Types
  class TradingPlanType < Types::BaseObject
    field :id, ID, null: false
    field :playbook, GraphQL::Types::JSON, null: false
    field :rules, GraphQL::Types::JSON, null: false
    field :weekly_intention, String, null: true
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
