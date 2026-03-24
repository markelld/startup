class DailyRecap < ApplicationRecord
  belongs_to :user

  validates :recap_date, presence: true
  validates :message_text, presence: true
  validates :user_id, uniqueness: { scope: :recap_date, message: 'already has a recap for this date' }
end
