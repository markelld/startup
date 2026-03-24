class AnalyticsClient
  ANALYTICS_URL = ENV.fetch("ANALYTICS_SERVICE_URL", "http://localhost:8000")
  INTERNAL_TOKEN = ENV.fetch("INTERNAL_API_TOKEN", "dev_token")

  def session_analytics(session)
    trades = session.trades.where(status: :closed).order(:entered_at)
    return if trades.empty?

    payload = {
      session_id: session.id,
      account_id: session.account_id,
      rules: session.account.effective_rules,
      trades: trades.map { |t| serialize_trade(t) }
    }

    response = HTTParty.post(
      "#{ANALYTICS_URL}/analytics/session",
      body: payload.to_json,
      headers: headers
    )

    return unless response.success?

    result = JSON.parse(response.body)
    session.update!(
      discipline_score: result["discipline_score"],
      analytics_payload: result
    )
    result
  rescue StandardError => e
    Rails.logger.error("Analytics session error: #{e.message}")
    nil
  end

  def behavioral_analysis(account_id)
    response = HTTParty.get(
      "#{ANALYTICS_URL}/analytics/behavioral/#{account_id}",
      headers: headers
    )
    return {} unless response.success?
    JSON.parse(response.body)
  rescue StandardError => e
    Rails.logger.error("Behavioral analysis error: #{e.message}")
    {}
  end

  def grade_trade(trade)
    payload = {
      trade_id: trade.id,
      instrument: trade.instrument,
      side: trade.side,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      stop_loss: trade.stop_loss,
      quantity: trade.quantity,
      net_pnl: trade.net_pnl,
      r_multiple: trade.r_multiple,
      duration_minutes: trade.duration_minutes,
      target_price: trade.target_price&.to_f
    }

    response = HTTParty.post(
      "#{ANALYTICS_URL}/analytics/grade_trade",
      body: payload.to_json,
      headers: headers
    )

    return default_grade unless response.success?
    JSON.parse(response.body)
  rescue StandardError => e
    Rails.logger.error("Grade trade error: #{e.message}")
    default_grade
  end

  private

  def headers
    {
      "Content-Type" => "application/json",
      "X-Internal-Token" => INTERNAL_TOKEN
    }
  end

  def serialize_trade(trade)
    {
      id: trade.id,
      instrument: trade.instrument,
      side: trade.side,
      quantity: trade.quantity,
      entry_price: trade.entry_price&.to_f,
      exit_price: trade.exit_price&.to_f,
      stop_loss: trade.stop_loss&.to_f,
      net_pnl: trade.net_pnl&.to_f,
      entered_at: trade.entered_at&.iso8601,
      exited_at: trade.exited_at&.iso8601,
      duration_minutes: trade.duration_minutes,
      r_multiple: trade.r_multiple&.to_f
    }
  end

  def default_grade
    { "grade" => "C", "setup_score" => 50.0, "entry_score" => 50.0,
      "risk_score" => 50.0, "mgmt_score" => 50.0, "coaching_notes" => "" }
  end
end
