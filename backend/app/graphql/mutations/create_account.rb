module Mutations
  class CreateAccount < Types::BaseMutation
    argument :firm_name, String, required: true
    argument :name, String, required: true
    argument :account_type, String, required: true
    argument :balance, Float, required: true
    argument :commission_per_contract, Float, required: false

    field :account, Types::AccountType, null: true
    field :errors, [String], null: false

    def resolve(firm_name:, name:, account_type:, balance:, commission_per_contract: nil)
      user = context[:current_user]
      return { account: nil, errors: ['Not authenticated'] } unless user

      unless %w[sim live prop].include?(account_type)
        return { account: nil, errors: ["Invalid account type. Must be sim, live, or prop."] }
      end

      account = user.accounts.build(
        firm_name: firm_name,
        name: name,
        account_type: account_type,
        balance: balance,
        commission_per_contract: commission_per_contract || 0.0,
        broker_connection: nil
      )

      if account.save
        { account: account, errors: [] }
      else
        { account: nil, errors: account.errors.full_messages }
      end
    end
  end
end
