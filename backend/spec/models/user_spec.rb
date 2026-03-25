require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'associations' do
    it { should have_many(:broker_connections).dependent(:destroy) }
    it { should have_many(:accounts).dependent(:destroy) }
    it { should have_one(:subscription).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:user) }
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
  end

  describe '#sms_eligible?' do
    it 'returns true when sms_enabled and phone present' do
      user = build(:user, sms_enabled: true, phone: '+15550001234')
      expect(user.sms_eligible?).to be true
    end

    it 'returns false when phone is blank' do
      user = build(:user, sms_enabled: true, phone: nil)
      expect(user.sms_eligible?).to be false
    end

    it 'returns false when sms_enabled is false' do
      user = build(:user, sms_enabled: false, phone: '+15550001234')
      expect(user.sms_eligible?).to be false
    end
  end

  describe '#active_or_trialing?' do
    it 'returns false when no subscription' do
      user = create(:user)
      expect(user.active_or_trialing?).to be false
    end
  end
end
