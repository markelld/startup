require 'rails_helper'

RSpec.describe CsvImportService do
  let(:user)    { create(:user) }
  let(:account) { create(:account, user: user, commission_per_contract: 0.0) }

  # ── Tradovate CSV helpers ────────────────────────────────────────────────────

  def tradovate_csv(rows)
    header = "symbol,qty,buyPrice,sellPrice,boughtTimestamp,soldTimestamp,pnl,duration,buyFillId,sellFillId"
    lines  = rows.map do |r|
      "#{r[:symbol]},#{r[:qty]},#{r[:buy]},#{r[:sell]},#{r[:bought]},#{r[:sold]},#{r[:pnl]},#{r[:duration] || '5min'},#{r[:buy_fill] || SecureRandom.hex(4)},#{r[:sell_fill] || SecureRandom.hex(4)}"
    end
    ([header] + lines).join("\n")
  end

  def long_row(overrides = {})
    {
      symbol:   'MNQ',
      qty:      1,
      buy:      19_000.0,
      sell:     19_010.0,
      bought:   '03/10/2026 09:30:00',
      sold:     '03/10/2026 09:35:00',
      pnl:      '$20.00'
    }.merge(overrides)
  end

  def short_row(overrides = {})
    {
      symbol:   'MNQ',
      qty:      1,
      buy:      19_010.0,
      sell:     19_000.0,
      bought:   '03/10/2026 09:40:00',  # bought AFTER sold → short
      sold:     '03/10/2026 09:35:00',
      pnl:      '$20.00'
    }.merge(overrides)
  end

  # ── Platform detection ───────────────────────────────────────────────────────

  describe 'format detection' do
    it 'auto-detects tradovate from buyPrice header' do
      csv = tradovate_csv([long_row])
      result = described_class.new(account, csv).import!
      expect(result[:trades_imported]).to eq(1)
      expect(result[:errors]).to be_empty
    end

    it 'accepts explicit platform: tradovate' do
      csv = tradovate_csv([long_row])
      result = described_class.new(account, csv, platform: 'tradovate').import!
      expect(result[:trades_imported]).to eq(1)
    end

    it 'returns error on empty CSV' do
      result = described_class.new(account, "symbol,qty\n", platform: 'tradovate').import!
      expect(result[:trades_imported]).to eq(0)
      expect(result[:errors]).to include('CSV has no data rows')
    end

    it 'returns error on malformed CSV' do
      result = described_class.new(account, "\"unclosed quote\nfoo,bar", platform: 'tradovate').import!
      expect(result[:errors].first).to match(/parse|CSV/i)
    end
  end

  # ── Long / Short detection ───────────────────────────────────────────────────

  describe 'Tradovate side detection' do
    it 'marks long when boughtTimestamp <= soldTimestamp' do
      csv   = tradovate_csv([long_row])
      described_class.new(account, csv).import!
      trade = account.trades.last
      expect(trade.side).to eq('long')
      expect(trade.entry_price).to eq(19_000.0)
      expect(trade.exit_price).to  eq(19_010.0)
    end

    it 'marks short when boughtTimestamp > soldTimestamp' do
      csv   = tradovate_csv([short_row])
      described_class.new(account, csv).import!
      trade = account.trades.last
      expect(trade.side).to eq('short')
      expect(trade.entry_price).to eq(19_000.0)  # sell price (earlier) = entry
      expect(trade.exit_price).to  eq(19_010.0)  # buy price (later) = exit
    end
  end

  # ── PnL and commission deduction ────────────────────────────────────────────

  describe 'commission deduction' do
    context 'when platform is tradovate (auto-detected)' do
      it 'deducts $0.95 per side per contract from raw pnl' do
        csv    = tradovate_csv([long_row(pnl: '$20.00', qty: 1)])
        described_class.new(account, csv).import!
        # 20.00 - (0.95 * 1 * 2) = 18.10
        expect(account.trades.last.net_pnl).to eq(18.10)
      end

      it 'scales commission with quantity' do
        csv = tradovate_csv([long_row(pnl: '$100.00', qty: 3)])
        described_class.new(account, csv).import!
        # 100.00 - (0.95 * 3 * 2) = 100.00 - 5.70 = 94.30
        expect(account.trades.last.net_pnl).to eq(94.30)
      end
    end

    context 'when platform is tradingview (no commission)' do
      it 'does not deduct commission' do
        # TradingView format: Symbol, Side, Type, Qty, Limit Price, Stop Price, Fill Price, Status, Commission, Placing Time, Closing Time, Order ID
        tv_csv = <<~CSV
          Symbol,Side,Type,Qty,Limit Price,Stop Price,Fill Price,Status,Commission,Placing Time,Closing Time,Order ID
          CME_MINI:MNQM2026,buy,Market,1,,,19000.00,Filled,0,2026-03-10 09:30:00,2026-03-10 09:30:01,ORD001
          CME_MINI:MNQM2026,sell,Market,1,,,19010.00,Filled,0,2026-03-10 09:35:00,2026-03-10 09:35:01,ORD002
        CSV
        described_class.new(account, tv_csv, platform: 'tradingview').import!
        trade = account.trades.last
        expect(trade).not_to be_nil
        # pnl = (19010 - 19000) * 1 * 2.0 = 20.0 (no commission)
        expect(trade.net_pnl).to eq(20.0)
      end
    end

    context 'when account has a custom commission_per_contract' do
      let(:custom_account) { create(:account, user: user, commission_per_contract: 1.50) }

      it 'falls back to account commission when platform is unknown' do
        csv = <<~CSV
          instrument,side,qty,entry_price,exit_price,pnl,datetime
          MNQ,buy,1,19000,19010,20.00,2026-03-10 09:30:00
        CSV
        described_class.new(custom_account, csv).import!
        trade = custom_account.trades.last
        # complete row importer uses pnl_raw directly when present, so pnl stays 20.0
        expect(trade.net_pnl).to eq(20.0)
      end
    end
  end

  # ── Idempotency ──────────────────────────────────────────────────────────────

  describe 'idempotency' do
    it 'does not duplicate trades on re-import' do
      buy_fill  = 'AAA1'
      sell_fill = 'BBB2'
      csv = tradovate_csv([long_row(buy_fill: buy_fill, sell_fill: sell_fill)])

      expect {
        described_class.new(account, csv).import!
        described_class.new(account, csv).import!
      }.to change { account.trades.count }.by(1)
    end
  end

  # ── PnL parsing — parenthesised negatives ────────────────────────────────────

  describe 'PnL parsing' do
    it 'parses parenthesised negative PnL from Tradovate' do
      csv = tradovate_csv([long_row(pnl: '($20.00)')])
      described_class.new(account, csv).import!
      # -20.00 - (0.95 * 1 * 2) = -21.90
      expect(account.trades.last.net_pnl).to eq(-21.90)
    end

    it 'handles dollar-sign positive PnL' do
      csv = tradovate_csv([long_row(pnl: '$50.00')])
      described_class.new(account, csv).import!
      expect(account.trades.last.net_pnl).to eq(48.10)
    end
  end

  # ── Session grouping ─────────────────────────────────────────────────────────

  describe 'session grouping' do
    it 'creates one session per date' do
      row1 = long_row(bought: '03/10/2026 09:30:00', sold: '03/10/2026 09:35:00',
                      buy_fill: 'F1', sell_fill: 'F2')
      row2 = long_row(bought: '03/10/2026 10:00:00', sold: '03/10/2026 10:05:00',
                      buy_fill: 'F3', sell_fill: 'F4')
      row3 = long_row(bought: '03/11/2026 09:30:00', sold: '03/11/2026 09:35:00',
                      buy_fill: 'F5', sell_fill: 'F6')

      csv = tradovate_csv([row1, row2, row3])
      described_class.new(account, csv).import!

      expect(account.trading_sessions.count).to eq(2)
      expect(account.trades.count).to eq(3)
    end

    it 'updates session net_pnl after import' do
      row1 = long_row(pnl: '$20.00', bought: '03/10/2026 09:30:00', sold: '03/10/2026 09:35:00',
                      buy_fill: 'G1', sell_fill: 'G2')
      row2 = long_row(pnl: '($10.00)', bought: '03/10/2026 10:00:00', sold: '03/10/2026 10:05:00',
                      buy_fill: 'G3', sell_fill: 'G4')

      csv = tradovate_csv([row1, row2])
      described_class.new(account, csv).import!

      session = account.trading_sessions.first
      # (20 - 1.90) + (-10 - 1.90) = 18.10 + (-11.90) = 6.20
      expect(session.net_pnl).to eq(6.20)
    end
  end

  # ── Point values ─────────────────────────────────────────────────────────────

  describe 'point_value helper' do
    subject(:service) { described_class.new(account, '') }

    {
      'MNQ'       => 2.0,
      'MNQH6'     => 2.0,
      'MNQM2026'  => 2.0,
      'NQ'        => 20.0,
      'ES'        => 50.0,
      'MES'       => 5.0,
      'GC'        => 100.0,
      'CL'        => 1000.0,
      'UNKNOWN'   => 1.0
    }.each do |symbol, expected|
      it "returns #{expected} for #{symbol}" do
        expect(service.send(:point_value, symbol)).to eq(expected)
      end
    end
  end
end
