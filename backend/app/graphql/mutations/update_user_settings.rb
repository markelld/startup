module Mutations
  class UpdateUserSettings < Types::BaseMutation
    argument :display_name, String, required: false
    argument :phone, String, required: false
    argument :sms_enabled, Boolean, required: false

    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(display_name: nil, phone: nil, sms_enabled: nil)
      user = context[:current_user]
      return { user: nil, errors: ['Not authenticated'] } unless user

      attrs = {}
      attrs[:display_name] = display_name unless display_name.nil?
      attrs[:phone]        = phone.presence  unless phone.nil?
      attrs[:sms_enabled]  = sms_enabled     unless sms_enabled.nil?

      if user.update(attrs)
        { user: user, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
