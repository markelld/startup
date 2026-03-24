module Mutations
  class SignIn < Types::BaseMutation
    argument :email, String, required: true
    argument :password, String, required: true

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(email:, password:)
      user = User.find_by(email: email.downcase)
      if user&.valid_password?(password)
        token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
        { token: token, user: user, errors: [] }
      else
        { token: nil, user: nil, errors: ["Invalid email or password"] }
      end
    end
  end
end
