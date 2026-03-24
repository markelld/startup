module Mutations
  class UpdateTradeJournal < Types::BaseMutation
    argument :id, ID, required: true
    argument :notes, String, required: false
    argument :emotion, String, required: false
    argument :screenshot_url, String, required: false
    argument :screenshot_data, String, required: false  # base64
    argument :stop_loss, Float, required: false
    argument :target_price, Float, required: false

    field :trade, Types::TradeType, null: true
    field :errors, [String], null: false

    def resolve(id:, notes: nil, emotion: nil, screenshot_url: nil, screenshot_data: nil, stop_loss: nil, target_price: nil)
      user = context[:current_user]
      return { trade: nil, errors: ["Not authenticated"] } unless user

      trade = user.accounts.flat_map(&:trades).find { |t| t.id.to_s == id }
      return { trade: nil, errors: ["Trade not found"] } unless trade

      attrs = {}
      attrs[:notes]        = notes        if notes
      attrs[:emotion]      = emotion      if emotion
      attrs[:screenshot_url] = screenshot_url if screenshot_url
      attrs[:stop_loss]    = stop_loss    unless stop_loss.nil?
      attrs[:target_price] = target_price unless target_price.nil?

      if trade.update(attrs)
        { trade: trade, errors: [] }
      else
        { trade: nil, errors: trade.errors.full_messages }
      end
    end
  end
end
