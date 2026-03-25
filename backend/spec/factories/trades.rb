FactoryBot.define do
  factory :trade do
    association :trading_session
    association :account
    broker_trade_id { "csv-#{SecureRandom.hex(8)}" }
    instrument { 'MNQ' }
    side { :long }
    quantity { 1 }
    entry_price { 19_000.0 }
    exit_price { 19_010.0 }
    net_pnl { 20.0 }
    entered_at { 1.hour.ago }
    exited_at { 30.minutes.ago }
    status { :closed }
  end
end
