module Mutations
  class CreateCheckoutSession < Types::BaseMutation
    field :url, String, null: true
    field :errors, [String], null: false

    def resolve
      user = context[:current_user]
      return { url: nil, errors: ["Not authenticated"] } unless user

      session = BillingService.new(user).create_checkout_session
      { url: session.url, errors: [] }
    rescue Stripe::StripeError => e
      { url: nil, errors: [e.message] }
    end
  end
end
