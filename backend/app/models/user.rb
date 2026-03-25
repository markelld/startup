class User < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  has_many :broker_connections, dependent: :destroy
  has_many :accounts, dependent: :destroy
  has_one :subscription, dependent: :destroy
  has_many :daily_recaps, dependent: :destroy
  has_one :trading_plan, dependent: :destroy

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :phone, uniqueness: true, allow_nil: true

  def sms_eligible?
    sms_enabled? && phone.present?
  end

  def active_or_trialing?
    return true if ENV['BETA_MODE'] == 'true'
    subscription&.active_or_trialing? || false
  end
end
