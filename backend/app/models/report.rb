class Report < ApplicationRecord
  belongs_to :account

  enum :report_type, { daily: 0, weekly: 1, overall: 2, monthly: 3, yearly: 4 }

  validates :report_type, presence: true
  validates :period_start, presence: true
  validates :period_end, presence: true
end
