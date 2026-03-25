require 'rails_helper'

RSpec.describe Account, type: :model do
  describe 'associations' do
    it { should belong_to(:user) }
    it { should belong_to(:broker_connection).optional }
    it { should have_many(:trading_sessions).dependent(:destroy) }
    it { should have_many(:trades).dependent(:destroy) }
    it { should have_many(:reports).dependent(:destroy) }
  end

  describe 'validations' do
    it { should validate_presence_of(:user_id) }
  end

  describe '#daily_pnl' do
    it 'returns net_pnl for the given date' do
      account = create(:account)
      session = create(:trading_session, account: account, session_date: Date.current, net_pnl: 150.0)
      expect(account.daily_pnl(Date.current)).to eq(150.0)
    end

    it 'returns 0 when no session exists for the date' do
      account = create(:account)
      expect(account.daily_pnl(Date.current)).to eq(0)
    end
  end

  describe '#effective_rules' do
    it 'merges custom rules over defaults' do
      account = create(:account, rules: { 'max_contracts' => 10 })
      expect(account.effective_rules['max_contracts']).to eq(10)
      expect(account.effective_rules['daily_loss_limit']).to eq(-2000)
    end
  end
end
