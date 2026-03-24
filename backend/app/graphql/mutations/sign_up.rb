module Mutations
  class SignUp < Types::BaseMutation
    argument :email, String, required: true
    argument :password, String, required: true
    argument :display_name, String, required: false

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(email:, password:, display_name: nil)
      user = User.new(
        email: email.downcase,
        password: password,
        display_name: display_name
      )
      if user.save
        token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
        { token: token, user: user, errors: [] }
      else
        { token: nil, user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
