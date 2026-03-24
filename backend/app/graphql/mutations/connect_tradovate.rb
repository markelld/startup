module Mutations
  class ConnectTradovate < Types::BaseMutation
    argument :api_key, String, required: true
    argument :demo, Boolean, required: false, default_value: false

    field :broker_connection, Types::BrokerConnectionType, null: true
    field :errors, [String], null: false

    def resolve(api_key:, demo:)
      user = context[:current_user]
      return { broker_connection: nil, errors: ["Not authenticated"] } unless user

      result = AuthService.new(user).authenticate!(api_key: api_key, demo: demo)
      { broker_connection: result, errors: [] }
    rescue StandardError => e
      { broker_connection: nil, errors: [e.message] }
    end
  end
end
