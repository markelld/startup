class Order < ApplicationRecord
  belongs_to :trade
  belongs_to :account
  has_many :fills, dependent: :destroy

  enum :side, { buy: 0, sell: 1 }
  enum :order_type, { market: 0, limit_order: 1, stop: 2 }
  enum :status, { pending: 0, filled: 1, cancelled: 2, partial: 3 }

  validates :account_id, presence: true
end
