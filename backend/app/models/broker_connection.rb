class BrokerConnection < ApplicationRecord
  belongs_to :user
  has_many :accounts, dependent: :destroy

  enum :status, { pending: 0, active: 1, error: 2 }

  attr_encrypted :access_token, key: :encryption_key
  attr_encrypted :refresh_token, key: :encryption_key

  validates :broker, presence: true
  validates :user_id, presence: true

  def token_expired?
    token_expires_at.present? && token_expires_at < Time.current
  end

  private

  def encryption_key
    key = ENV.fetch("ATTR_ENCRYPTED_KEY", "a" * 32)
    key.ljust(32, "0")[0, 32]
  end
end
