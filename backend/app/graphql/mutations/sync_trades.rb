module Mutations
  class SyncTrades < Types::BaseMutation
    argument :account_id, ID, required: true
    argument :date, GraphQL::Types::ISO8601Date, required: false

    field :enqueued, Boolean, null: false
    field :errors, [String], null: false

    def resolve(account_id:, date: Date.current)
      user = context[:current_user]
      return { enqueued: false, errors: ["Not authenticated"] } unless user

      account = user.accounts.find(account_id)
      SyncTradovateTradesJob.perform_async(account.id, date.to_s)
      { enqueued: true, errors: [] }
    rescue ActiveRecord::RecordNotFound
      { enqueued: false, errors: ["Account not found"] }
    end
  end
end
