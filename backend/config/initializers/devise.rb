require 'devise/orm/active_record'

Devise.setup do |config|
  config.mailer_sender = "noreply@zone.app"
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]
  config.skip_session_storage = [:http_auth]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = false
  config.expire_all_remember_me_on_sign_out = true
  config.password_length = 8..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.sign_out_via = :delete

  # JWT config
  config.jwt do |jwt|
    jwt.secret = ENV.fetch("DEVISE_JWT_SECRET_KEY") { SecureRandom.hex(64) }
    jwt.dispatch_requests = [
      ["POST", %r{^/graphql$}]
    ]
    jwt.revocation_requests = [
      ["DELETE", %r{^/graphql$}]
    ]
    jwt.expiration_time = 24.hours.to_i
  end
end
