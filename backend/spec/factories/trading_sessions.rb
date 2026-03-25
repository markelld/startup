FactoryBot.define do
  factory :trading_session do
    association :account
    session_date { Date.current }
    market_session { 0 }
    net_pnl { 0.0 }
  end
end
