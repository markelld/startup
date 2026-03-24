module Mutations
  class CreatePortalSession < Types::BaseMutation
    field :url, String, null: true
    field :errors, [String], null: false

    def resolve
      user = context[:current_user]
      return { url: nil, errors: ["Not authenticated"] } unless user
      return { url: nil, errors: ["No active subscription"] } unless user.subscription

      portal = BillingService.new(user).create_portal_session
      { url: portal.url, errors: [] }
    rescue Stripe::StripeError => e
      { url: nil, errors: [e.message] }
    end
  end
end
