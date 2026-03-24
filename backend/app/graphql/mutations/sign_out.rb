module Mutations
  class SignOut < Types::BaseMutation
    field :success, Boolean, null: false

    def resolve
      user = context[:current_user]
      return { success: false } unless user
      user.update!(jti: SecureRandom.uuid)
      { success: true }
    end
  end
end
