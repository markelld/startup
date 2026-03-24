class Trade < ApplicationRecord
  belongs_to :trading_session
  belongs_to :account
  has_many :orders, dependent: :destroy
  has_one_attached :screenshot

  enum :side, { long: 0, short: 1 }
  enum :status, { open: 0, closed: 1 }

  validates :broker_trade_id, presence: true, uniqueness: { scope: :account_id }
  validates :instrument, presence: true

  GRADES = %w[A B C F].freeze

  def composite_score
    scores = [setup_score, entry_score, risk_score, mgmt_score].compact
    return nil if scores.empty?
    scores.sum / scores.size
  end

  def calculate_r_multiple
    return nil unless entry_price && exit_price && stop_loss
    risk = (entry_price - stop_loss).abs
    return nil if risk.zero?
    reward = (exit_price - entry_price).abs * (side == "long" ? 1 : -1)
    (reward / risk).round(2)
  end
end
