module Types
  class BrokerConnectionType < Types::BaseObject
    field :id, ID, null: false
    field :broker, String, null: false
    field :status, String, null: false
    field :demo_mode, Boolean, null: false
    field :token_expires_at, GraphQL::Types::ISO8601DateTime
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
