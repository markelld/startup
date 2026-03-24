module Mutations
  class UpdateAccountRules < Types::BaseMutation
    argument :id, ID, required: true
    argument :daily_loss_limit, Float, required: false
    argument :max_contracts, Integer, required: false
    argument :max_trades_per_session, Integer, required: false
    argument :max_consecutive_losses, Integer, required: false

    field :account, Types::AccountType, null: true
    field :errors, [String], null: false

    def resolve(id:, **rule_args)
      user = context[:current_user]
      return { account: nil, errors: ["Not authenticated"] } unless user

      account = user.accounts.find(id)
      new_rules = account.rules.merge(rule_args.compact.transform_keys(&:to_s))

      if account.update(rules: new_rules)
        { account: account, errors: [] }
      else
        { account: nil, errors: account.errors.full_messages }
      end
    end
  end
end
