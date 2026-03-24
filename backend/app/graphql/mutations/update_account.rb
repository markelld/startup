module Mutations
  class UpdateAccount < Types::BaseMutation
    argument :id,                      ID,     required: true
    argument :firm_name,               String, required: false
    argument :name,                    String, required: false
    argument :account_type,            String, required: false
    argument :balance,                 Float,  required: false
    argument :commission_per_contract, Float,  required: false

    field :account, Types::AccountType, null: true
    field :errors,  [String],           null: false

    def resolve(id:, firm_name: nil, name: nil, account_type: nil, balance: nil, commission_per_contract: nil)
      user = context[:current_user]
      return { account: nil, errors: ['Not authenticated'] } unless user

      account = user.accounts.find_by(id: id)
      return { account: nil, errors: ['Account not found'] } unless account

      if account_type && !%w[sim live prop].include?(account_type)
        return { account: nil, errors: ['Invalid account type. Must be sim, live, or prop.'] }
      end

      attrs = {}
      attrs[:firm_name]               = firm_name               if firm_name
      attrs[:name]                    = name                    if name
      attrs[:account_type]            = account_type            if account_type
      attrs[:balance]                 = balance                 if balance
      attrs[:commission_per_contract] = commission_per_contract unless commission_per_contract.nil?

      if account.update(attrs)
        { account: account, errors: [] }
      else
        { account: nil, errors: account.errors.full_messages }
      end
    end
  end
end
