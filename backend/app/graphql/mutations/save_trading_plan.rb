module Mutations
  class SaveTradingPlan < Types::BaseMutation
    argument :playbook, GraphQL::Types::JSON, required: false
    argument :rules, GraphQL::Types::JSON, required: false
    argument :weekly_intention, String, required: false

    field :trading_plan, Types::TradingPlanType, null: true
    field :errors, [String], null: false

    def resolve(playbook: nil, rules: nil, weekly_intention: nil)
      user = context[:current_user]
      return { trading_plan: nil, errors: ['Not authenticated'] } unless user

      plan = user.trading_plan || user.build_trading_plan

      attrs = {}
      attrs[:playbook]          = playbook          unless playbook.nil?
      attrs[:rules]             = rules             unless rules.nil?
      attrs[:weekly_intention]  = weekly_intention  unless weekly_intention.nil?

      if plan.update(attrs)
        { trading_plan: plan, errors: [] }
      else
        { trading_plan: nil, errors: plan.errors.full_messages }
      end
    end
  end
end
