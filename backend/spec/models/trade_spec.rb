require 'rails_helper'

RSpec.describe Trade, type: :model do
  describe 'associations' do
    it { should belong_to(:trading_session) }
    it { should belong_to(:account) }
    it { should have_many(:orders).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:trade) }
    it { should validate_presence_of(:instrument) }
    it { should validate_presence_of(:broker_trade_id) }
  end

  describe '#composite_score' do
    it 'returns mean of available scores' do
      trade = build(:trade, setup_score: 80, entry_score: 90, risk_score: 70, mgmt_score: nil)
      expect(trade.composite_score).to eq(80.0)
    end

    it 'returns nil when no scores set' do
      trade = build(:trade, setup_score: nil, entry_score: nil, risk_score: nil, mgmt_score: nil)
      expect(trade.composite_score).to be_nil
    end
  end

  describe '#calculate_r_multiple' do
    it 'returns nil when stop_loss is absent' do
      trade = build(:trade, entry_price: 19_000, exit_price: 19_010, stop_loss: nil)
      expect(trade.calculate_r_multiple).to be_nil
    end

    it 'returns nil when risk is zero' do
      trade = build(:trade, entry_price: 19_000, exit_price: 19_010, stop_loss: 19_000, side: :long)
      expect(trade.calculate_r_multiple).to be_nil
    end

    it 'calculates positive R for winning long' do
      trade = build(:trade, entry_price: 19_000, exit_price: 19_020, stop_loss: 18_990, side: :long)
      # risk = 10, reward = 20 → R = 2.0
      expect(trade.calculate_r_multiple).to eq(2.0)
    end
  end
end
