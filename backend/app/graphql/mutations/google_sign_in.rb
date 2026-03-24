module Mutations
  class GoogleSignIn < Types::BaseMutation
    argument :id_token, String, required: true

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(id_token:)
      # Verify the Google ID token
      payload = verify_google_token(id_token)
      return { token: nil, user: nil, errors: ["Invalid Google token"] } unless payload

      google_uid = payload["sub"]
      email      = payload["email"]
      name       = payload["name"] || payload["given_name"]

      return { token: nil, user: nil, errors: ["Google account has no email"] } if email.blank?

      # Find by google_uid first, then by email (to link existing accounts)
      user = User.find_by(google_uid: google_uid) ||
             User.find_by(email: email.downcase)

      if user
        user.update_columns(google_uid: google_uid) if user.google_uid.blank?
      else
        # Create new user — no password needed for Google accounts
        user = User.new(
          email: email.downcase,
          display_name: name,
          google_uid: google_uid,
          password: SecureRandom.hex(24)
        )
        return { token: nil, user: nil, errors: user.errors.full_messages } unless user.save
      end

      jwt_token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
      { token: jwt_token, user: user, errors: [] }
    rescue StandardError => e
      { token: nil, user: nil, errors: ["Authentication failed: #{e.message}"] }
    end

    private

    def verify_google_token(id_token)
      response = HTTParty.get(
        "https://oauth2.googleapis.com/tokeninfo",
        query: { id_token: id_token },
        timeout: 5
      )
      return nil unless response.code == 200

      payload = response.parsed_response
      return nil if payload["error_description"].present?

      # Verify the token was issued for our app
      client_id = ENV["GOOGLE_CLIENT_ID"]
      return nil if client_id.present? && payload["aud"] != client_id

      payload
    end
  end
end
