class Account < ApplicationRecord
  belongs_to :user
  belongs_to :broker_connection, optional: true

  has_many :trading_sessions, dependent: :destroy
  has_many :trades, dependent: :destroy
  has_many :rule_violations, dependent: :destroy
  has_many :reports, dependent: :destroy

  enum :account_type, { sim: 0, live: 1, prop: 2 }

  validates :broker_account_id, uniqueness: true, allow_blank: true
  validates :user_id, presence: true

  def daily_pnl(date = Date.current)
    trading_sessions.find_by(session_date: date)&.net_pnl || 0
  end

  def default_rules
    {
      "daily_loss_limit" => -2000,
      "max_contracts" => 5,
      "max_trades_per_session" => 10,
      "max_consecutive_losses" => 3
    }
  end

  def effective_rules
    default_rules.merge(rules || {})
  end
end
