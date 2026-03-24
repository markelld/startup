class StripeEventHandlerService
  def self.handle(event)
    new(event).process
  end

  def initialize(event)
    @event = event
    @data = event.data.object
  end

  def process
    case @event.type
    when "checkout.session.completed"
      handle_checkout_completed
    when "customer.subscription.updated"
      handle_subscription_updated
    when "customer.subscription.deleted"
      handle_subscription_deleted
    when "invoice.payment_succeeded"
      handle_payment_succeeded
    when "invoice.payment_failed"
      handle_payment_failed
    when "customer.subscription.trial_will_end"
      handle_trial_will_end
    end
  end

  private

  def handle_checkout_completed
    return unless @data.mode == "subscription"

    user_id = @data.metadata["user_id"]
    return unless user_id

    user = User.find_by(id: user_id)
    return unless user

    stripe_sub = Stripe::Subscription.retrieve(@data.subscription)

    user.create_subscription!(
      stripe_customer_id: @data.customer,
      stripe_subscription_id: @data.subscription,
      stripe_price_id: ENV["STRIPE_PRICE_ID"],
      status: stripe_sub.status == "trialing" ? :trialing : :active,
      current_period_start: Time.at(stripe_sub.current_period_start),
      current_period_end: Time.at(stripe_sub.current_period_end),
      trial_ends_at: stripe_sub.trial_end ? Time.at(stripe_sub.trial_end) : nil
    )
  rescue ActiveRecord::RecordNotUnique
    # Already exists, update instead
    user&.subscription&.update!(
      stripe_customer_id: @data.customer,
      stripe_subscription_id: @data.subscription,
      status: :active
    )
  end

  def handle_subscription_updated
    sub = find_subscription
    return unless sub

    sub.update!(
      status: map_status(@data.status),
      current_period_start: Time.at(@data.current_period_start),
      current_period_end: Time.at(@data.current_period_end),
      cancel_at_period_end: @data.cancel_at_period_end
    )
  end

  def handle_subscription_deleted
    sub = find_subscription
    sub&.update!(status: :canceled)
  end

  def handle_payment_succeeded
    sub_id = @data.subscription
    return unless sub_id

    sub = Subscription.find_by(stripe_subscription_id: sub_id)
    sub&.update!(
      status: :active,
      current_period_end: Time.at(@data.lines.data.first&.period&.end || Time.current.to_i)
    )
  end

  def handle_payment_failed
    sub_id = @data.subscription
    return unless sub_id

    sub = Subscription.find_by(stripe_subscription_id: sub_id)
    sub&.update!(status: :past_due)
  end

  def handle_trial_will_end
    # Could trigger an email notification here
    Rails.logger.info("Trial ending for subscription #{@data.id}")
  end

  def find_subscription
    Subscription.find_by(stripe_subscription_id: @data.id)
  end

  def map_status(stripe_status)
    case stripe_status
    when "active"    then :active
    when "trialing"  then :trialing
    when "past_due"  then :past_due
    when "canceled", "cancelled" then :canceled
    else :incomplete
    end
  end
end
