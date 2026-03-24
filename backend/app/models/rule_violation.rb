class RuleViolation < ApplicationRecord
  belongs_to :trading_session
  belongs_to :trade, optional: true
  belongs_to :account

  enum :rule_type, {
    daily_loss: 0,
    max_size: 1,
    revenge_trade: 2,
    overtrading: 3,
    consecutive_losses: 4
  }

  validates :rule_type, presence: true
  validates :description, presence: true
end
