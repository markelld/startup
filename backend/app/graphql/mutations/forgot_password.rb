module Mutations
  class ForgotPassword < Types::BaseMutation
    argument :email, String, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(email:)
      user = User.find_by(email: email.downcase.strip)
      if user
        token = user.send(:set_reset_password_token)
        frontend_url = ENV.fetch('FRONTEND_URL', 'http://localhost:5173')
        reset_url = "#{frontend_url}/auth?mode=reset&token=#{token}"
        UserMailer.reset_password_email(user, reset_url).deliver_later
      end
      # Always return success to avoid user enumeration
      { success: true, errors: [] }
    end
  end
end
