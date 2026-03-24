class CheckRuleViolationsJob
  include Sidekiq::Job

  sidekiq_options queue: :analytics, retry: 2

  REVENGE_WINDOW_MINUTES = 3

  def perform(account_id, session_id)
    account = Account.find(account_id)
    session = TradingSession.find(session_id)
    rules   = account.effective_rules

    check_daily_loss_limit(session, rules)
    check_position_sizing(session, rules)
    check_revenge_trading(session)
    check_overtrading(session, rules)
    check_consecutive_losses(session, rules)
  end

  private

  def check_daily_loss_limit(session, rules)
    limit = rules["daily_loss_limit"].to_f
    return if limit.zero? || session.net_pnl >= limit

    create_violation(
      session: session,
      rule_type: :daily_loss,
      description: "Daily loss limit of $#{limit.abs} breached. Session P&L: $#{session.net_pnl}",
      severity: 10.0,
      impact_pnl: session.net_pnl - limit
    )
  end

  def check_position_sizing(session, rules)
    max_contracts = rules["max_contracts"].to_i
    return if max_contracts.zero?

    session.trades.where(status: :closed).each do |trade|
      next if trade.quantity <= max_contracts

      create_violation(
        session: session,
        trade: trade,
        rule_type: :max_size,
        description: "Position size #{trade.quantity} contracts exceeds max #{max_contracts}",
        severity: 7.0,
        impact_pnl: trade.net_pnl
      )
    end
  end

  def check_revenge_trading(session)
    trades = session.trades.where(status: :closed).order(:entered_at).to_a

    trades.each_with_index do |trade, i|
      next if i.zero?

      prev_trade = trades[i - 1]
      next unless prev_trade.net_pnl.to_f < 0

      time_diff = (trade.entered_at - prev_trade.exited_at) / 60.0
      next unless time_diff <= REVENGE_WINDOW_MINUTES
      next unless trade.quantity >= prev_trade.quantity

      trade.update!(is_revenge_trade: true)

      create_violation(
        session: session,
        trade: trade,
        rule_type: :revenge_trade,
        description: "Potential revenge trade: entered #{time_diff.round(1)}min after $#{prev_trade.net_pnl.round(2)} loss with #{trade.quantity >= prev_trade.quantity ? 'same or larger' : 'smaller'} size",
        severity: 8.0,
        impact_pnl: trade.net_pnl
      )
    end
  end

  def check_overtrading(session, rules)
    max_trades = rules["max_trades_per_session"].to_i
    return if max_trades.zero?

    count = session.trades.where(status: :closed).count
    return if count <= max_trades

    create_violation(
      session: session,
      rule_type: :overtrading,
      description: "#{count} trades exceeds session limit of #{max_trades}",
      severity: 6.0,
      impact_pnl: 0
    )
  end

  def check_consecutive_losses(session, rules)
    max_consecutive = rules["max_consecutive_losses"].to_i
    return if max_consecutive.zero?

    trades = session.trades.where(status: :closed).order(:entered_at)
    streak = 0
    trades.each do |trade|
      if trade.net_pnl.to_f < 0
        streak += 1
        if streak >= max_consecutive
          create_violation(
            session: session,
            trade: trade,
            rule_type: :consecutive_losses,
            description: "#{streak} consecutive losses — should pause trading",
            severity: 7.0,
            impact_pnl: trade.net_pnl
          )
        end
      else
        streak = 0
      end
    end
  end

  def create_violation(session:, rule_type:, description:, severity:, impact_pnl:, trade: nil)
    RuleViolation.find_or_create_by(
      trading_session: session,
      rule_type: rule_type,
      trade: trade
    ) do |v|
      v.account = session.account
      v.description = description
      v.severity = severity
      v.impact_pnl = impact_pnl
    end
  end
end
