class TradingSession < ApplicationRecord
  belongs_to :account
  has_many :trades, dependent: :destroy
  has_many :rule_violations, dependent: :destroy

  enum :market_session, { ny: 0, london: 1, asia: 2, pm: 3 }

  validates :session_date, presence: true
  validates :account_id, uniqueness: { scope: :session_date }

  def recalculate_stats!
    closed = trades.where(status: :closed)
    return if closed.empty?

    self.net_pnl = closed.sum(:net_pnl)

    save!
  end

  def win_rate
    closed = trades.where(status: :closed)
    return 0.0 if closed.empty?
    (closed.where("net_pnl > 0").count.to_f / closed.count * 100).round(1)
  end

  def profit_factor
    closed = trades.where(status: :closed)
    gross_profit = closed.where("net_pnl > 0").sum(:net_pnl).to_f
    gross_loss   = closed.where("net_pnl < 0").sum(:net_pnl).abs.to_f
    return 0.0 if gross_loss.zero?
    (gross_profit / gross_loss).round(2)
  end

  def trade_count
    trades.where(status: :closed).count
  end
end
