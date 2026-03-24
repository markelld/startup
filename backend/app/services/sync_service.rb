class SyncService
  TRADOVATE_BASE = ENV.fetch("TRADOVATE_API_URL", "https://demo.tradovateapi.com/v1")

  NY_OPEN  = { hour: 9,  min: 30 }.freeze
  NY_CLOSE = { hour: 16, min: 0  }.freeze
  LONDON_OPEN  = { hour: 3,  min: 0 }.freeze
  LONDON_CLOSE = { hour: 9,  min: 30 }.freeze

  def initialize(account)
    @account = account
    @connection = account.broker_connection
  end

  def sync_trades_for_date!(date)
    refresh_if_needed!

    fills = fetch_fills(date)
    return if fills.empty?

    session = find_or_create_session(date)
    trades_data = group_fills_into_trades(fills)

    trades_data.each do |trade_data|
      upsert_trade!(session, trade_data)
    end

    session.recalculate_stats!
    AnalyticsClient.new.session_analytics(session)
    session
  end

  def detect_market_session(date)
    # Default to NY session
    :ny
  end

  private

  def refresh_if_needed!
    return unless @connection.token_expired?
    AuthService.new(@connection.user).refresh_token!(@connection)
  end

  def fetch_fills(date)
    start_time = date.to_time.beginning_of_day.utc.iso8601
    end_time   = date.to_time.end_of_day.utc.iso8601

    response = HTTParty.get(
      "#{TRADOVATE_BASE}/fill/list",
      query: {
        accountId: @account.broker_account_id,
        startTimestamp: start_time,
        endTimestamp: end_time
      },
      headers: {
        "Authorization" => "Bearer #{@connection.access_token}",
        "Content-Type" => "application/json"
      }
    )

    return [] unless response.success?
    JSON.parse(response.body)
  rescue StandardError => e
    Rails.logger.error("Fill fetch error: #{e.message}")
    []
  end

  def group_fills_into_trades(fills)
    # Group fills by contract/instrument into trades
    grouped = fills.group_by { |f| f["contractId"] }
    grouped.map do |_contract_id, contract_fills|
      buys  = contract_fills.select { |f| f["action"] == "Buy" }
      sells = contract_fills.select { |f| f["action"] == "Sell" }

      entry = buys.first || sells.first
      exit_fill = (buys + sells).last

      qty = [buys.sum { |f| f["qty"].to_i }, sells.sum { |f| f["qty"].to_i }].min

      entry_price = entry["price"].to_f
      exit_price  = exit_fill["price"].to_f
      side = buys.count >= sells.count ? "long" : "short"

      net_pnl = calculate_pnl(side, entry_price, exit_price, qty)

      {
        broker_trade_id: "#{entry["id"]}-#{exit_fill["id"]}",
        instrument: contract_fills.first["contractSymbol"] || "UNKNOWN",
        side: side,
        quantity: qty,
        entry_price: entry_price,
        exit_price: exit_price,
        net_pnl: net_pnl,
        entered_at: Time.parse(entry["timestamp"]),
        exited_at: Time.parse(exit_fill["timestamp"]),
        fills: contract_fills
      }
    end
  end

  def upsert_trade!(session, trade_data)
    fills = trade_data.delete(:fills)
    trade = @account.trades.find_or_initialize_by(broker_trade_id: trade_data[:broker_trade_id])
    trade.trading_session = session
    trade.status = :closed
    trade.duration_minutes = ((trade_data[:exited_at] - trade_data[:entered_at]) / 60).round
    trade.assign_attributes(trade_data.except(:fills))
    trade.save!
    trade
  end

  def find_or_create_session(date)
    @account.trading_sessions.find_or_create_by(session_date: date) do |s|
      s.market_session = detect_market_session(date)
    end
  end

  def calculate_pnl(side, entry, exit_p, qty)
    tick_value = 50  # ES default — in production use contract spec
    if side == "long"
      (exit_p - entry) * qty * tick_value
    else
      (entry - exit_p) * qty * tick_value
    end
  end
end
