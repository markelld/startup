class AddMonthlyYearlyToReportType < ActiveRecord::Migration[8.1]
  def change
    # monthly: 3, yearly: 4 added to Report model enum — no column change needed
  end
end
