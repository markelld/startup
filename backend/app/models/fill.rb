class Fill < ApplicationRecord
  belongs_to :order
  belongs_to :account

  validates :broker_fill_id, presence: true, uniqueness: true
  validates :instrument, presence: true
end
