class Subscription < ApplicationRecord
  belongs_to :user

  enum :status, {
    trialing: 0,
    active: 1,
    past_due: 2,
    canceled: 3,
    incomplete: 4
  }

  validates :user_id, uniqueness: true

  def active_or_trialing?
    active? || trialing?
  end
end
