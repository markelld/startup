module Mutations
  class ChangePassword < Types::BaseMutation
    argument :current_password, String, required: true
    argument :new_password,     String, required: true

    field :success, Boolean, null: false
    field :errors,  [String], null: false

    def resolve(current_password:, new_password:)
      user = context[:current_user]
      return { success: false, errors: ['Not authenticated'] } unless user

      unless user.valid_password?(current_password)
        return { success: false, errors: ['Current password is incorrect'] }
      end

      if new_password.length < 8
        return { success: false, errors: ['New password must be at least 8 characters'] }
      end

      if user.update(password: new_password)
        { success: true, errors: [] }
      else
        { success: false, errors: user.errors.full_messages }
      end
    end
  end
end
