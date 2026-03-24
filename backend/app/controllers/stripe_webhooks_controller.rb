class StripeWebhooksController < ApplicationController
  skip_before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, raise: false

  def create
    payload    = request.body.read
    sig_header = request.env["HTTP_STRIPE_SIGNATURE"]
    webhook_secret = ENV["STRIPE_WEBHOOK_SECRET"]

    event = Stripe::Webhook.construct_event(payload, sig_header, webhook_secret)
    StripeEventHandlerService.handle(event)

    render json: { received: true }
  rescue JSON::ParserError => e
    render json: { error: "Invalid payload: #{e.message}" }, status: :bad_request
  rescue Stripe::SignatureVerificationError => e
    render json: { error: "Invalid signature: #{e.message}" }, status: :bad_request
  rescue StandardError => e
    Rails.logger.error("Stripe webhook error: #{e.message}")
    render json: { error: "Webhook processing failed" }, status: :internal_server_error
  end
end
