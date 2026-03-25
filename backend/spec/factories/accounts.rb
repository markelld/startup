FactoryBot.define do
  factory :account do
    association :user
    name { Faker::Company.name }
    firm_name { 'Apex Trader Funding' }
    account_type { :prop }
    balance { 50_000.0 }
    commission_per_contract { 0.0 }
    rules { {} }
  end
end
