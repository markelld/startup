class CoachingService
  MODEL = "claude-haiku-4-5-20251001"
  ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

  def generate_period_report(account, period_type, period_start)
    case period_type.to_sym
    when :weekly
      start_date = period_start.beginning_of_week
      end_date   = period_start.end_of_week
      label      = "Week of #{start_date.strftime('%b %d, %Y')}"
    when :monthly
      start_date = period_start.beginning_of_month
      end_date   = period_start.end_of_month
      label      = period_start.strftime('%B %Y')
    when :yearly
      start_date = period_start.beginning_of_year
      end_date   = period_start.end_of_year
      label      = period_start.strftime('%Y')
    else
      return nil
    end

    sessions = account.trading_sessions.where(session_date: start_date..end_date).order(:session_date)
    all_trades = sessions.flat_map { |s| s.trades.where(status: :closed) }
    return nil if sessions.empty?

    total_pnl    = all_trades.sum { |t| t.net_pnl.to_f }
    winners      = all_trades.select { |t| t.net_pnl.to_f > 0 }
    losers       = all_trades.reject { |t| t.net_pnl.to_f > 0 }
    win_rate     = all_trades.empty? ? 0 : (winners.size.to_f / all_trades.size * 100).round(1)
    gross_profit = winners.sum { |t| t.net_pnl.to_f }
    gross_loss   = losers.sum  { |t| t.net_pnl.to_f }.abs
    profit_factor = gross_loss.zero? ? 0 : (gross_profit / gross_loss).round(2)
    avg_r        = all_trades.filter_map { |t| t.r_multiple&.to_f }.then { |rs| rs.empty? ? 'N/A' : (rs.sum / rs.size).round(2) }
    revenge_count = all_trades.count(&:is_revenge_trade)
    avg_discipline = sessions.filter_map { |s| s.discipline_score&.to_f }.then { |sc| sc.empty? ? 'N/A' : (sc.sum / sc.size).round(1) }

    # Collect journal notes and emotions from trades
    journal_entries = all_trades.select { |t| t.notes.present? || t.emotion.present? }
    notes_section = if journal_entries.any?
      journal_entries.map { |t|
        parts = []
        parts << "#{t.instrument} #{t.side.upcase} $#{t.net_pnl.to_f.round(2)}"
        parts << "Emotion: #{t.emotion}" if t.emotion.present?
        parts << "\"#{t.notes}\"" if t.notes.present?
        "  - #{parts.join(' | ')}"
      }.join("\n")
    else
      "  No journal notes recorded for this period."
    end

    plan_ctx = trading_plan_context(account)
    primary_instrument = all_trades.group_by(&:instrument).max_by { |_, ts| ts.size }&.first
    market_summaries = sessions.filter_map { |s|
      ctx = primary_instrument ? fetch_market_context(primary_instrument, s.session_date.to_s) : nil
      ctx.present? ? "  #{s.session_date}: #{ctx}" : nil
    }.join("\n")

    prompt = <<~PROMPT
      You are an elite futures trading coach. Provide a #{period_type} performance review for #{label}.
      The trader has shared their journal notes — reference them directly in your coaching to make it personal and specific.
      #{plan_ctx.present? ? "\n#{plan_ctx}" : ""}
      #{market_summaries.present? ? "\nMARKET CONDITIONS BY DAY:\n#{market_summaries}\n" : ""}

      PERIOD SUMMARY:
      Sessions: #{sessions.count} trading days
      Total Trades: #{all_trades.size}
      Total P&L: $#{total_pnl.round(2)}
      Win Rate: #{win_rate}%
      Profit Factor: #{profit_factor}
      Avg R-Multiple: #{avg_r}
      Avg Discipline Score: #{avg_discipline}/100
      Revenge Trades: #{revenge_count}

      DAILY BREAKDOWN:
      #{sessions.map { |s| "  #{s.session_date.strftime('%a %b %d')}: $#{s.net_pnl.to_f.round(2)} | #{s.trade_count} trades | #{s.win_rate.to_f.round(1)}% WR" }.join("\n")}

      TRADER'S JOURNAL NOTES:
      #{notes_section}

      Using both the performance data AND the trader's own words, respond in exactly this format:

      SUMMARY:
      [2-3 sentences that reference the trader's notes and emotions alongside the numbers]

      INSIGHTS:
      - [pattern identified from both data and journal entries]
      - [psychological or emotional pattern from their own words]
      - [risk/reward or consistency pattern]

      ACTIONS:
      - [highest-priority improvement tied to their journal observations#{plan_ctx.present? ? " and trading plan" : ""}]
      - [specific habit or rule to implement]
      - [mindset adjustment that addresses what they wrote]
    PROMPT

    result = parse_report_sections(call_claude(prompt, max_tokens: 1500))
    result.merge(
      period_start: start_date,
      period_end: end_date,
      stats: {
        net_pnl: total_pnl.round(2),
        trade_count: all_trades.size,
        win_rate: win_rate,
        profit_factor: profit_factor,
        session_count: sessions.count,
        avg_discipline: avg_discipline
      }
    )
  end

  def generate_overall_report(account)
    sessions = account.trading_sessions.order(:session_date).last(30)
    all_trades = sessions.flat_map { |s| s.trades.where(status: :closed) }

    return nil if sessions.empty?

    total_pnl     = all_trades.sum { |t| t.net_pnl.to_f }
    winners       = all_trades.select { |t| t.net_pnl.to_f > 0 }
    losers        = all_trades.select { |t| t.net_pnl.to_f <= 0 }
    win_rate      = all_trades.empty? ? 0 : (winners.size.to_f / all_trades.size * 100).round(1)
    gross_profit  = winners.sum { |t| t.net_pnl.to_f }
    gross_loss    = losers.sum  { |t| t.net_pnl.to_f }.abs
    profit_factor = gross_loss.zero? ? 0 : (gross_profit / gross_loss).round(2)
    avg_r         = all_trades.filter_map { |t| t.r_multiple&.to_f }.then { |rs| rs.empty? ? 0 : (rs.sum / rs.size).round(2) }
    revenge_count = all_trades.count(&:is_revenge_trade)
    emotions      = all_trades.filter_map(&:emotion).tally.sort_by { |_, v| -v }.first(3).map { |e, c| "#{e} (#{c}x)" }.join(", ")
    instruments   = all_trades.group_by(&:instrument).transform_values { |ts| ts.sum { |t| t.net_pnl.to_f }.round(2) }.sort_by { |_, v| -v }.first(5)

    plan_ctx = trading_plan_context(account)
    primary_instrument = all_trades.group_by(&:instrument).max_by { |_, ts| ts.size }&.first
    market_summaries = sessions.filter_map { |s|
      ctx = primary_instrument ? fetch_market_context(primary_instrument, s.session_date.to_s) : nil
      ctx.present? ? "  #{s.session_date}: #{ctx}" : nil
    }.join("\n")

    prompt = <<~PROMPT
      You are an elite futures trading coach. Provide an overall performance coaching report based on the last #{sessions.size} trading sessions.
      #{market_summaries.present? ? "\nMARKET CONDITIONS BY DAY:\n#{market_summaries}\n" : ""}
      #{plan_ctx.present? ? "\n#{plan_ctx}" : ""}

      ACCOUNT OVERVIEW (Last #{sessions.size} sessions):
      Total P&L: $#{total_pnl.round(2)}
      Total Trades: #{all_trades.size}
      Win Rate: #{win_rate}%
      Profit Factor: #{profit_factor}
      Avg R-Multiple: #{avg_r}
      Revenge Trades: #{revenge_count} (#{all_trades.empty? ? 0 : (revenge_count.to_f / all_trades.size * 100).round(1)}% of trades)
      Most Common Emotions: #{emotions.presence || "not recorded"}

      TOP INSTRUMENTS BY P&L:
      #{instruments.map { |inst, pnl| "  #{inst}: $#{pnl}" }.join("\n")}

      DAILY SESSIONS:
      #{sessions.last(10).map { |s| "  #{s.session_date}: $#{s.net_pnl} | #{s.trade_count} trades | #{s.win_rate.to_f.round(1)}% WR" }.join("\n")}

      Respond in exactly this format:

      SUMMARY:
      [2-3 sentence overview of overall trading performance and key patterns]

      INSIGHTS:
      - [pattern or strength identified across sessions]
      - [behavioral or psychological pattern]
      - [risk/reward pattern]

      ACTIONS:
      - [highest-priority improvement to make]
      - [specific habit or rule to implement]
      - [mindset or process adjustment]
    PROMPT

    parse_report_sections(call_claude(prompt, max_tokens: 1500))
  end

  def generate_daily_report(session)
    trades = session.trades.where(status: :closed).order(:entered_at)
    violations = session.rule_violations

    # Pull market context from Python service for the primary instrument traded
    primary_instrument = trades.group_by(&:instrument).max_by { |_, ts| ts.size }&.first
    market_ctx = primary_instrument ? fetch_market_context(primary_instrument, session.session_date.to_s) : ""

    prompt = build_daily_prompt(session, trades, violations, trading_plan_context(session.account), market_ctx)
    response = call_claude(prompt, max_tokens: 1500)

    parse_report_sections(response)
  end

  def grade_trades_batch(trades, trading_plan: nil)
    primary = trades.group_by(&:instrument).max_by { |_, ts| ts.size }&.first
    session_date = trades.filter_map(&:entered_at).min&.to_date&.to_s
    market_ctx = (primary && session_date) ? fetch_market_context(primary, session_date) : ""

    trade_list = trades.each_with_index.map do |t, i|
      <<~ENTRY
        Trade #{i + 1} (id: #{t.id}):
        - Instrument: #{t.instrument} #{t.side.upcase} #{t.quantity}x
        - Entry: #{t.entry_price} | Exit: #{t.exit_price || "open"} | Stop: #{t.stop_loss || "none"} | Target: #{t.target_price || "none"}
        - P&L: $#{t.net_pnl} | R: #{t.r_multiple || "N/A"} | Duration: #{t.duration_minutes ? "#{t.duration_minutes}m" : "N/A"}
        - Emotion: #{t.emotion || "none"} | Revenge: #{t.is_revenge_trade ? "YES" : "no"}
        - Notes: #{t.notes.presence || "none"}
      ENTRY
    end.join("\n")

    playbook_section = if trading_plan&.playbook.present?
      setups = trading_plan.playbook.map { |s| "  - #{s['name']}: #{s['description']}" }.join("\n")
      <<~BLOCK
        TRADER'S APPROVED PLAYBOOK (these are the ONLY setups they should be trading):
        #{setups}

        off_playbook: Set to true if the trade does not clearly match any of the above setups.
        If the trader has no playbook entries, always set off_playbook to false.
      BLOCK
    else
      "The trader has not set up a playbook yet. Set off_playbook to false for all trades."
    end

    prompt = <<~PROMPT
      You are an elite futures trading coach. Grade each trade below and return ONLY a valid JSON array, no other text.
      #{market_ctx.present? ? "\nMARKET CONDITIONS ON THIS SESSION:\n#{market_ctx}\n" : ""}
      #{playbook_section}

      IMPORTANT — CSV IMPORT LIMITATION:
      Many trades are imported from a broker CSV which does not include stop loss or target price.
      When stop is "none" and target is "none", DO NOT penalize risk_score for missing a stop —
      evaluate risk_score based on loss size, revenge flag, and position discipline instead.
      If the trader HAS added notes or emotion, weight those heavily in coaching_notes.

      Score each dimension 0-100:
      - setup_score: setup quality — use R-multiple and P&L if no stop/target available
      - entry_score: entry execution — price action and timing relative to outcome
      - risk_score: risk management — loss size, revenge flag, position discipline
      - mgmt_score: trade management — target capture, duration, exit quality
      Grade thresholds: A >= 85, B >= 70, C >= 50, F < 50
      composite_score = average of all four scores

      TRADES:
      #{trade_list}

      Return exactly this JSON array with one object per trade in the same order:
      [
        {
          "trade_id": "the id from the trade",
          "grade": "A|B|C|F",
          "setup_score": 0-100,
          "entry_score": 0-100,
          "risk_score": 0-100,
          "mgmt_score": 0-100,
          "composite_score": 0-100,
          "off_playbook": true or false,
          "coaching_notes": "1-2 sentences — if off-playbook, call it out by name. If notes/emotion present, reference them."
        }
      ]
    PROMPT

    max_tokens = 300 + (trades.size * 180)
    response = call_claude(prompt, max_tokens: max_tokens)
    cleaned = response.gsub(/```json\s*/i, '').gsub(/```/, '').strip
    JSON.parse(cleaned)
  rescue JSON::ParserError, StandardError => e
    Rails.logger.error("Batch grade error: #{e.message}")
    []
  end

  def grade_trade(trade, trading_plan: nil)
    session_date = trade.entered_at&.to_date&.to_s
    market_ctx = session_date ? fetch_market_context(trade.instrument, session_date) : ""

    playbook_section = if trading_plan&.playbook.present?
      setups = trading_plan.playbook.map { |s| "  - #{s['name']}: #{s['description']}" }.join("\n")
      <<~BLOCK
        TRADER'S APPROVED PLAYBOOK (the only setups they should be trading):
        #{setups}

        Set off_playbook to true if this trade does not clearly match any of the above setups.
      BLOCK
    else
      "The trader has no playbook yet. Set off_playbook to false."
    end

    prompt = <<~PROMPT
      You are an elite futures trading coach. Grade this trade and return ONLY valid JSON, no other text.
      #{market_ctx.present? ? "\nMARKET CONDITIONS ON THIS DAY:\n#{market_ctx}\n" : ""}
      #{playbook_section}

      Trade Data:
      - Instrument: #{trade.instrument}
      - Direction: #{trade.side}
      - Quantity: #{trade.quantity} contracts
      - Entry Price: #{trade.entry_price}
      - Exit Price: #{trade.exit_price || "not yet closed"}
      - Stop Loss: #{trade.stop_loss || "none set"}
      - Target Price: #{trade.target_price || "none set"}
      - Net P&L: $#{trade.net_pnl}
      - R-Multiple: #{trade.r_multiple || "N/A"}
      - Duration: #{trade.duration_minutes ? "#{trade.duration_minutes} minutes" : "N/A"}
      - Emotion: #{trade.emotion || "not recorded"}
      - Revenge Trade: #{trade.is_revenge_trade ? "YES" : "no"}
      - Notes: #{trade.notes || "none"}

      IMPORTANT — if Stop Loss or Target Price are "none set", this is a CSV import.
      Do NOT penalize risk_score for missing stop. Evaluate based on actual loss size and outcome discipline.

      Score each dimension 0-100:
      - setup_score: setup quality
      - entry_score: entry execution
      - risk_score: risk discipline — loss control, revenge flag
      - mgmt_score: trade management — exit quality, duration

      Return this exact JSON:
      {
        "grade": "A|B|C|F",
        "setup_score": 0-100,
        "entry_score": 0-100,
        "risk_score": 0-100,
        "mgmt_score": 0-100,
        "composite_score": 0-100,
        "off_playbook": true or false,
        "coaching_notes": "2-3 sentences — if off-playbook, name it explicitly. Reference emotion/notes if present."
      }

      Grade thresholds: A >= 85, B >= 70, C >= 50, F < 50
      composite_score = average of all four scores
    PROMPT

    response = call_claude(prompt, max_tokens: 450)
    cleaned = response.gsub(/```json\s*/i, '').gsub(/```/, '').strip
    JSON.parse(cleaned)
  rescue JSON::ParserError, StandardError => e
    Rails.logger.error("Grade trade error: #{e.message}")
    { "grade" => "C", "setup_score" => 50.0, "entry_score" => 50.0,
      "risk_score" => 50.0, "mgmt_score" => 50.0, "composite_score" => 50.0,
      "off_playbook" => false, "coaching_notes" => "Unable to generate coaching at this time." }
  end

  def generate_trade_coaching(trade)
    prompt = <<~PROMPT
      Analyze this futures trade and provide coaching feedback:

      Instrument: #{trade.instrument}
      Direction: #{trade.side}
      Entry: #{trade.entry_price}
      Exit: #{trade.exit_price}
      Stop Loss: #{trade.stop_loss}
      P&L: $#{trade.net_pnl}
      R-Multiple: #{trade.r_multiple}
      Duration: #{trade.duration_minutes} minutes
      Is Revenge Trade: #{trade.is_revenge_trade}
      Emotion: #{trade.emotion}
      Notes: #{trade.notes}

      Provide specific, actionable coaching in 3-5 sentences. Focus on risk management,
      entry precision, and psychological discipline.
    PROMPT

    call_claude(prompt, max_tokens: 600)
  end

  def generate_weekly_summary(sessions)
    stats = aggregate_weekly_stats(sessions)
    prompt = build_weekly_prompt(stats, sessions)
    response = call_claude(prompt, max_tokens: 2000)
    parse_report_sections(response)
  end

  private

  def trading_plan_context(account)
    plan = account.user.trading_plan
    return "" unless plan

    lines = []

    if plan.playbook.present?
      setups = plan.playbook.map { |s| "  - #{s['name']}: #{s['description']}#{s['conditions'].present? ? " (#{s['conditions']})" : ""}" }.join("\n")
      lines << "TRADER'S APPROVED SETUPS (Playbook):\n#{setups}"
    end

    if plan.rules.present?
      lines << "TRADER'S PERSONAL RULES:\n#{plan.rules.map { |r| "  - #{r}" }.join("\n")}"
    end

    if plan.weekly_intention.present?
      lines << "WEEKLY INTENTION: \"#{plan.weekly_intention}\""
    end

    return "" if lines.empty?

    <<~BLOCK
      ═══ TRADER'S TRADING PLAN ═══
      #{lines.join("\n\n")}
      ════════════════════════════

    BLOCK
  end

  def build_daily_prompt(session, trades, violations, plan_context = "", market_context = "")
    win_rate = session.win_rate
    profit_factor = session.profit_factor
    discipline_score = session.discipline_score

    <<~PROMPT
      You are an elite futures trading coach. Analyze this trading session and provide detailed coaching.
      #{plan_context.present? ? "\n#{plan_context}" : ""}
      #{market_context.present? ? "MARKET CONDITIONS:\n#{market_context}\n\n" : ""}SESSION: #{session.session_date} | Market: #{session.market_session} | Net P&L: $#{session.net_pnl}
      Stats: #{trades.count} trades | Win Rate: #{win_rate}% | Profit Factor: #{profit_factor} | Discipline Score: #{discipline_score}/100

      TRADES:
      #{trades.map { |t| "  #{t.side.upcase} #{t.quantity}x #{t.instrument} @ #{t.entry_price} → #{t.exit_price} | P&L: $#{t.net_pnl} | R: #{t.r_multiple} | #{t.duration_minutes}min#{t.is_revenge_trade ? ' [REVENGE]' : ''}" }.join("\n")}

      RULE VIOLATIONS:
      #{violations.map { |v| "  ⚠️ #{v.rule_type.upcase}: #{v.description}" }.join("\n")}

      #{plan_context.present? ? "Cross-reference the trader's playbook and rules against what actually happened today. Call out any setups that don't match the playbook or rules that were broken.\n\n" : ""}Respond in exactly this format:

      SUMMARY:
      [2-3 sentence overview of the session]

      INSIGHTS:
      - [insight 1 — reference playbook/rules if applicable]
      - [insight 2]
      - [insight 3]

      ACTIONS:
      - [specific action tied to their trading plan]
      - [specific action to take tomorrow]
      - [specific action to take tomorrow]
    PROMPT
  end

  def build_weekly_prompt(stats, sessions)
    <<~PROMPT
      You are an elite futures trading coach. Provide a weekly performance review.

      WEEK SUMMARY:
      Total P&L: $#{stats[:total_pnl]}
      Total Trades: #{stats[:total_trades]}
      Win Rate: #{stats[:win_rate]}%
      Profit Factor: #{stats[:profit_factor]}
      Best Day: #{stats[:best_day]}
      Worst Day: #{stats[:worst_day]}
      Avg Discipline Score: #{stats[:avg_discipline]}

      DAILY BREAKDOWN:
      #{sessions.map { |s| "  #{s.session_date}: $#{s.net_pnl} | #{s.trade_count} trades | #{s.win_rate}% WR" }.join("\n")}

      Provide weekly coaching following the SUMMARY/INSIGHTS/ACTIONS format.
    PROMPT
  end

  def aggregate_weekly_stats(sessions)
    total_pnl = sessions.sum(&:net_pnl)
    all_trades = sessions.flat_map { |s| s.trades.where(status: :closed) }
    winners = all_trades.select { |t| t.net_pnl.to_f > 0 }
    win_rate = all_trades.empty? ? 0 : (winners.count.to_f / all_trades.count * 100).round(1)

    gross_profit = winners.sum { |t| t.net_pnl.to_f }
    losers = all_trades.reject { |t| t.net_pnl.to_f > 0 }
    gross_loss = losers.sum { |t| t.net_pnl.to_f }.abs
    profit_factor = gross_loss.zero? ? 0 : (gross_profit / gross_loss).round(2)

    best = sessions.max_by(&:net_pnl)
    worst = sessions.min_by(&:net_pnl)

    {
      total_pnl: total_pnl,
      total_trades: all_trades.count,
      win_rate: win_rate,
      profit_factor: profit_factor,
      best_day: best ? "#{best.session_date} ($#{best.net_pnl})" : "N/A",
      worst_day: worst ? "#{worst.session_date} ($#{worst.net_pnl})" : "N/A",
      avg_discipline: sessions.filter_map(&:discipline_score).then { |scores| scores.empty? ? 0 : (scores.sum / scores.size).round(1) }
    }
  end

  def fetch_market_context(instrument, date)
    python_url = ENV.fetch("PYTHON_API_URL", "http://localhost:8000")
    response = HTTParty.get(
      "#{python_url}/market/session-context",
      query: { instrument: instrument, date: date },
      timeout: 5
    )
    return "" unless response.success?
    data = JSON.parse(response.body)
    data["summary"] || ""
  rescue StandardError => e
    Rails.logger.warn("Market context fetch failed: #{e.message}")
    ""
  end

  def call_claude(prompt, max_tokens: 1000)
    response = HTTParty.post(
      ANTHROPIC_API_URL,
      body: {
        model: MODEL,
        max_tokens: max_tokens,
        messages: [{ role: "user", content: prompt }]
      }.to_json,
      headers: {
        "Content-Type" => "application/json",
        "x-api-key" => ENV["ANTHROPIC_API_KEY"],
        "anthropic-version" => "2023-06-01"
      }
    )

    raise "Claude API error: #{response.body}" unless response.success?

    data = JSON.parse(response.body)
    data.dig("content", 0, "text") || ""
  end

  def parse_report_sections(text)
    summary = text[/SUMMARY:\s*(.*?)(?=INSIGHTS:|ACTIONS:|$)/m, 1]&.strip || ""
    insights = text[/INSIGHTS:\s*(.*?)(?=ACTIONS:|$)/m, 1]&.strip || ""
    actions = text[/ACTIONS:\s*(.*?)$/m, 1]&.strip || ""

    {
      ai_summary: summary,
      key_insights: insights,
      improvement_areas: actions
    }
  end
end
