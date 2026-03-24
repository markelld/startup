require 'csv'

class CsvImportService
  POINT_VALUES = {
    'MNQ' => 2.0, 'NQ' => 20.0, 'MES' => 5.0, 'ES' => 50.0,
    'MYM' => 0.50, 'YM' => 5.0, 'MGC' => 10.0, 'GC' => 100.0,
    'MCL' => 100.0, 'CL' => 1000.0, 'RTY' => 50.0, 'M2K' => 10.0
  }.freeze

  # Commission per contract per side (entry + exit = 2x)
  PLATFORM_COMMISSIONS = {
    'tradovate'   => 0.95,
    'tradingview' => 0.0
  }.freeze

  def initialize(account, csv_data, platform: nil)
    @account  = account
    @csv_data = csv_data
    @platform = platform&.downcase&.strip
    @errors   = []
    @trades_imported = 0
  end

  def import!
    rows = parse_csv
    return { trades_imported: 0, errors: ['Could not parse CSV'] } if rows.nil?
    return { trades_imported: 0, errors: ['CSV has no data rows'] } if rows.empty?

    headers = rows.first.headers.map { |h| h.to_s.strip.downcase }

    case @platform
    when 'tradovate'
      @detected_platform = 'tradovate'
      import_tradovate_rows(rows)
    when 'tradingview'
      @detected_platform = 'tradingview'
      import_tradingview_orders(rows)
    else
      if tradovate_format?(headers)
        @detected_platform = 'tradovate'
        import_tradovate_rows(rows)
      elsif tradingview_order_format?(headers)
        @detected_platform = 'tradingview'
        import_tradingview_orders(rows)
      elsif has_both_entry_and_exit?(headers)
        import_complete_rows(rows)
      else
        import_fill_rows(rows)
      end
    end

    { trades_imported: @trades_imported, errors: @errors }
  end

  private

  def parse_csv
    CSV.parse(@csv_data.strip, headers: true, header_converters: :downcase)
  rescue CSV::MalformedCSVError => e
    @errors << "CSV parse error: #{e.message}"
    nil
  end

  # ── Format detection ──────────────────────────────────────────────────────────

  def tradovate_format?(headers)
    headers.include?('buyprice') || headers.include?('boughttimestamp')
  end

  # TradingView order history: Symbol, Side, Type, Fill Price, Status, Placing Time, Closing Time
  def tradingview_order_format?(headers)
    headers.include?('fill price') && headers.include?('placing time') && headers.include?('closing time')
  end

  def has_both_entry_and_exit?(headers)
    find_header(headers, %w[entry_price entry]) && find_header(headers, %w[exit_price exit])
  end

  # ── Tradovate parser ──────────────────────────────────────────────────────────
  # Columns: symbol, qty, buyPrice, sellPrice, boughtTimestamp, soldTimestamp, pnl

  def import_tradovate_rows(rows)
    sessions = {}

    rows.each_with_index do |row, idx|
      begin
        instrument = row['symbol'].to_s.strip.upcase
        next if instrument.blank?

        qty        = row['qty'].to_s.strip.to_i
        buy_price  = parse_float(row['buyprice'])
        sell_price = parse_float(row['sellprice'])
        pnl        = parse_tradovate_pnl(row['pnl'])
        bought_at  = parse_tradovate_time(row['boughttimestamp'])
        sold_at    = parse_tradovate_time(row['soldtimestamp'])
        duration   = parse_tradovate_duration(row['duration'])

        next if buy_price.nil? || sell_price.nil? || bought_at.nil? || sold_at.nil?

        if bought_at <= sold_at
          side        = 'long'
          entry_price = buy_price
          exit_price  = sell_price
          entered_at  = bought_at
          exited_at   = sold_at
        else
          side        = 'short'
          entry_price = sell_price
          exit_price  = buy_price
          entered_at  = sold_at
          exited_at   = bought_at
        end

        date    = entered_at.to_date
        session = sessions[date] ||= find_or_create_session(date)

        broker_trade_id = "csv-#{row['buyfillid']}-#{row['sellfillid']}"
        trade = @account.trades.find_or_initialize_by(broker_trade_id: broker_trade_id)
        rate = PLATFORM_COMMISSIONS.fetch(@detected_platform || @platform || '', @account.commission_per_contract.to_f)
        commission = rate * qty * 2
        trade.assign_attributes(
          trading_session:  session,
          instrument:       instrument,
          side:             side,
          quantity:         qty,
          entry_price:      entry_price,
          exit_price:       exit_price,
          net_pnl:          (pnl - commission).round(2),
          entered_at:       entered_at,
          exited_at:        exited_at,
          duration_minutes: duration,
          status:           :closed
        )

        if trade.save
          @trades_imported += 1
        else
          @errors << "Row #{idx + 2}: #{trade.errors.full_messages.join(', ')}"
        end
      rescue => e
        @errors << "Row #{idx + 2} skipped: #{e.message}"
      end
    end

    sessions.values.each { |s| s.update_column(:net_pnl, s.trades.where(status: :closed).sum(:net_pnl)) }
  end

  def parse_tradovate_pnl(raw)
    return 0.0 unless raw
    str = raw.to_s.strip.gsub('$', '').gsub(',', '')
    str.start_with?('(') && str.end_with?(')') ? -str[1..-2].to_f : str.to_f
  end

  def parse_tradovate_time(raw)
    return nil unless raw
    DateTime.strptime(raw.to_s.strip, '%m/%d/%Y %H:%M:%S')
  rescue ArgumentError
    nil
  end

  def parse_tradovate_duration(raw)
    return nil unless raw
    raw.to_s.match(/(\d+)min/)&.captures&.first.to_i
  end

  # ── TradingView order history parser ─────────────────────────────────────────
  # Columns: Symbol, Side, Type, Qty, Limit Price, Stop Price, Fill Price,
  #          Status, Commission, Placing Time, Closing Time, Order ID, ...
  #
  # Strategy: FIFO position tracker per symbol using Filled orders.
  # Cancelled Limit/Stop orders placed at same time as entry → stop_loss / target_price.

  def import_tradingview_orders(rows)
    sessions = {}

    # Build OCO map: "symbol:placing_time" => { buy_stop, buy_limit, sell_stop, sell_limit }
    oco_map = {}
    rows.each do |row|
      status = row['status'].to_s.strip.downcase
      next unless %w[cancelled filled].include?(status)

      placing = row['placing time'].to_s.strip
      symbol  = parse_tv_symbol(row['symbol'])
      key     = "#{symbol}:#{placing}"
      oco_map[key] ||= {}

      order_type = row['type'].to_s.strip.downcase
      side       = row['side'].to_s.strip.downcase
      stop_p     = parse_float(row['stop price'])
      limit_p    = parse_float(row['limit price'])

      oco_map[key]["#{side}_stop"]  = stop_p  if order_type == 'stop'  && stop_p
      oco_map[key]["#{side}_limit"] = limit_p if order_type == 'limit' && limit_p
    end

    # Only process filled orders, sorted chronologically by fill time
    filled = rows.select { |r| r['status'].to_s.strip.downcase == 'filled' }
    filled.sort_by! { |r| parse_tv_time(r['closing time']) || DateTime.new(0) }

    # FIFO position tracker per symbol
    positions = {}  # symbol => { side:, qty:, price:, time:, placing_time: }

    filled.each do |row|
      symbol     = parse_tv_symbol(row['symbol'])
      fill_side  = row['side'].to_s.strip.downcase   # 'buy' or 'sell'
      qty        = row['qty'].to_s.strip.to_i
      fill_price = parse_float(row['fill price'])
      fill_time  = parse_tv_time(row['closing time'])
      placing    = row['placing time'].to_s.strip
      order_id   = row['order id'].to_s.strip

      next if fill_price.nil? || fill_time.nil? || qty.zero?

      trade_side = fill_side == 'buy' ? 'long' : 'short'
      pos = positions[symbol]

      if pos.nil?
        # Open new position
        positions[symbol] = { side: trade_side, qty: qty, price: fill_price,
                              time: fill_time, placing_time: placing }

      elsif pos[:side] != trade_side
        # Closing (or reversing) position
        close_qty = [qty, pos[:qty]].min
        pv        = point_value(symbol)
        dir       = pos[:side] == 'long' ? 1 : -1
        net_pnl   = (fill_price - pos[:price]) * close_qty * pv * dir

        # Extract stop/target from OCO orders placed at same time as entry
        oco        = oco_map["#{symbol}:#{pos[:placing_time]}"] || {}
        stop_loss, target_price = if pos[:side] == 'long'
          [oco['sell_stop'], oco['sell_limit']]
        else
          [oco['buy_stop'], oco['buy_limit']]
        end

        date    = pos[:time].to_date
        session = sessions[date] ||= find_or_create_session(date)
        duration = ((fill_time - pos[:time]) / 60).round rescue nil

        broker_trade_id = "tv-#{order_id}-#{pos[:time].to_i}"
        trade = @account.trades.find_or_initialize_by(broker_trade_id: broker_trade_id)
        trade.assign_attributes(
          trading_session:  session,
          instrument:       symbol,
          side:             pos[:side],
          quantity:         close_qty,
          entry_price:      pos[:price],
          exit_price:       fill_price,
          net_pnl:          net_pnl.round(2),
          stop_loss:        stop_loss,
          target_price:     target_price,
          entered_at:       pos[:time],
          exited_at:        fill_time,
          duration_minutes: duration,
          status:           :closed
        )

        if trade.save
          @trades_imported += 1
        else
          @errors << "#{symbol} trade: #{trade.errors.full_messages.join(', ')}"
        end

        # If fill reversed position (qty > pos qty), open remainder as new position
        remaining = qty - pos[:qty]
        positions[symbol] = remaining > 0 ? { side: trade_side, qty: remaining, price: fill_price, time: fill_time, placing_time: placing } : nil

      else
        # Same direction — replace with latest entry (scaling simplified)
        positions[symbol] = { side: trade_side, qty: qty, price: fill_price,
                              time: fill_time, placing_time: placing }
      end
    end

    sessions.values.each { |s| s.update_column(:net_pnl, s.trades.where(status: :closed).sum(:net_pnl)) }
  end

  # Strip exchange prefix and normalize: "CME_MINI:MNQM2026" → "MNQM2026"
  def parse_tv_symbol(raw)
    return 'UNKNOWN' unless raw
    raw.to_s.strip.split(':').last.gsub(/\d+!$/, '').upcase
  end

  # Parses TradingView datetime: "2026-03-12 10:04:53" or ISO format
  def parse_tv_time(raw)
    return nil unless raw
    DateTime.parse(raw.to_s.strip)
  rescue ArgumentError, TypeError
    nil
  end

  # ── Generic complete-row import ───────────────────────────────────────────────

  def import_complete_rows(rows)
    sessions = {}
    rows.each_with_index do |row, idx|
      begin
        instrument = parse_instrument(col(row, %w[symbol contract instrument]))
        next if instrument.blank?

        side    = parse_side(col(row, ['buy/sell', 'b/s', 'side'])) || 'long'
        qty     = parse_int(col(row, %w[qty quantity])) || 1
        entry   = parse_float(col(row, %w[entry_price entry]))
        exit_p  = parse_float(col(row, %w[exit_price exit]))
        next if entry.nil? || exit_p.nil?

        fees    = parse_float(col(row, %w[commission fees])) || 0.0
        pnl_raw = parse_float(col(row, ['p/l', 'net p&l', 'profit/loss', 'pnl']))
        entered_at = parse_time(col(row, ['datetime', 'date/time', 'time', 'timestamp', 'date'])) || Time.current
        date    = entered_at.to_date
        pv      = point_value(instrument)
        dir     = side == 'long' ? 1 : -1
        net_pnl = pnl_raw || ((exit_p - entry) * qty * pv * dir - fees)

        session = sessions[date] ||= find_or_create_session(date)
        trade = Trade.new(
          trading_session: session, account: @account,
          broker_trade_id: "csv-#{SecureRandom.hex(8)}",
          instrument: instrument, side: side, quantity: qty,
          entry_price: entry, exit_price: exit_p,
          net_pnl: net_pnl,
          entered_at: entered_at, exited_at: entered_at, status: :closed
        )

        if trade.save
          @trades_imported += 1
        else
          @errors << "Row #{idx + 2}: #{trade.errors.full_messages.join(', ')}"
        end
      rescue => e
        @errors << "Row #{idx + 2} skipped: #{e.message}"
      end
    end
    sessions.values.each { |s| s.update_column(:net_pnl, s.trades.where(status: :closed).sum(:net_pnl)) }
  end

  # ── Generic fill-row import ───────────────────────────────────────────────────

  def import_fill_rows(rows)
    fills = []
    rows.each_with_index do |row, idx|
      begin
        instrument = parse_instrument(col(row, %w[symbol contract instrument]))
        next if instrument.blank?
        side = parse_side(col(row, ['buy/sell', 'b/s', 'side']))
        next if side.nil?
        qty       = parse_int(col(row, %w[qty quantity])) || 1
        price     = parse_float(col(row, ['price', 'avg price', 'fill price'])) || 0.0
        fees      = parse_float(col(row, %w[commission fees])) || 0.0
        pnl       = parse_float(col(row, ['p/l', 'net p&l', 'profit/loss', 'pnl']))
        timestamp = parse_time(col(row, ['datetime', 'date/time', 'time', 'timestamp', 'date'])) || Time.current
        fills << { instrument: instrument, side: side, qty: qty, price: price,
                   fees: fees, pnl: pnl, timestamp: timestamp, date: timestamp.to_date }
      rescue => e
        @errors << "Row #{idx + 2} skipped: #{e.message}"
      end
    end

    sessions = {}
    fills.group_by { |f| [f[:instrument], f[:date]] }.each do |(instrument, date), group|
      buys  = group.select { |f| f[:side] == 'long'  }.sort_by { |f| f[:timestamp] }
      sells = group.select { |f| f[:side] == 'short' }.sort_by { |f| f[:timestamp] }
      session = sessions[date] ||= find_or_create_session(date)
      pv = point_value(instrument)

      if buys.any? && sells.any?
        buys.each_with_index do |entry_fill, i|
          exit_fill = sells[i]
          next unless exit_fill
          fees    = (entry_fill[:fees] || 0) + (exit_fill[:fees] || 0)
          net_pnl = entry_fill[:pnl] || exit_fill[:pnl] ||
                    ((exit_fill[:price] - entry_fill[:price]) * entry_fill[:qty] * pv - fees)
          duration = ((exit_fill[:timestamp] - entry_fill[:timestamp]) / 60).round rescue nil
          trade = Trade.new(
            trading_session: session, account: @account,
            broker_trade_id: "csv-#{SecureRandom.hex(8)}",
            instrument: instrument, side: 'long', quantity: entry_fill[:qty],
            entry_price: entry_fill[:price], exit_price: exit_fill[:price],
            net_pnl: net_pnl,
            entered_at: entry_fill[:timestamp], exited_at: exit_fill[:timestamp],
            duration_minutes: duration, status: :closed
          )
          @trades_imported += 1 if trade.save
        end
      end
    end
    sessions.values.each { |s| s.update_column(:net_pnl, s.trades.where(status: :closed).sum(:net_pnl)) }
  end

  # ── Shared helpers ────────────────────────────────────────────────────────────

  def find_header(headers, candidates)
    candidates.find { |c| headers.include?(c.downcase) }
  end

  def col(row, candidates)
    candidates.each do |c|
      val = row[c.downcase]
      return val.to_s.strip if val && val.to_s.strip != ''
    end
    nil
  end

  def parse_side(raw)
    return nil unless raw
    case raw.to_s.strip.downcase
    when 'buy', 'b', 'long'   then 'long'
    when 'sell', 's', 'short' then 'short'
    end
  end

  def parse_instrument(raw)
    raw.to_s.strip.upcase
  end

  # Handles: MNQ, MNQH6, MNQH26, MNQM2026, MNQ1!
  def point_value(instrument)
    base = instrument.to_s
      .gsub(/[FGHJKMNQUVXZ]\d{4}$/, '')  # M2026, H2026
      .gsub(/[FGHJKMNQUVXZ]\d{1,2}$/, '') # H6, M26
      .gsub(/\d+!$/, '')                   # 1!
    POINT_VALUES[base] || 1.0
  end

  def parse_float(raw)
    return nil unless raw
    cleaned = raw.to_s.strip.gsub(/[,$]/, '').gsub(/[()]/, '')
    return nil if cleaned.blank?
    cleaned.to_f
  rescue
    nil
  end

  def parse_int(raw)
    return nil unless raw
    raw.to_s.strip.gsub(/[,$]/, '').to_i
  rescue
    nil
  end

  def parse_time(raw)
    return nil unless raw
    DateTime.parse(raw.to_s.strip)
  rescue ArgumentError, TypeError
    nil
  end

  def find_or_create_session(date)
    @account.trading_sessions.find_or_create_by!(session_date: date) do |s|
      s.market_session = 0
      s.net_pnl        = 0
    end
  end
end
