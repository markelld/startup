Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # GraphQL endpoint
  post "/graphql", to: "graphql#execute"

  # Screenshot upload
  post "/trades/:trade_id/screenshot", to: "screenshots#create"

  # ActionCable WebSocket
  mount ActionCable.server => "/cable"

  # Stripe webhooks (raw body required — skip CSRF)
  post "/stripe/webhooks", to: "stripe_webhooks#create"

  # Twilio inbound SMS webhook
  post "/twilio/inbound", to: "twilio_webhooks#inbound"

  # Internal API for FastAPI analytics service
  namespace :internal do
    resources :accounts, only: [] do
      resources :sessions, only: [:index], controller: "sessions"
    end
  end

  # Sidekiq Web UI (protect in production)
  require "sidekiq/web"
  if Rails.env.development?
    mount Sidekiq::Web => "/sidekiq"
  end
end
