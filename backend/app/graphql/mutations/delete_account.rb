module Mutations
  class DeleteAccount < Types::BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      return { success: false, errors: ['Not authenticated'] } unless user

      account = user.accounts.find_by(id: id)
      return { success: false, errors: ['Account not found'] } unless account

      account.destroy
      { success: true, errors: [] }
    rescue => e
      { success: false, errors: [e.message] }
    end
  end
end
