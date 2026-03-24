class BillingService
  def initialize(user)
    @user = user
  end

  def create_checkout_session
    Stripe::Checkout::Session.create(
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{
        price: ENV["STRIPE_PRICE_ID"],
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" }
        }
      },
      customer_email: @user.email,
      success_url: "#{frontend_url}/dashboard?checkout=success",
      cancel_url: "#{frontend_url}/?checkout=cancelled",
      metadata: { user_id: @user.id }
    )
  end

  def create_portal_session
    Stripe::BillingPortal::Session.create(
      customer: @user.subscription.stripe_customer_id,
      return_url: "#{frontend_url}/dashboard"
    )
  end

  private

  def frontend_url
    ENV.fetch("FRONTEND_URL", "http://localhost:5173")
  end
end
