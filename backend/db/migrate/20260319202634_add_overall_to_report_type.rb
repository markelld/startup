class AddOverallToReportType < ActiveRecord::Migration[8.1]
  def change
    # Enum is stored as integer; 2 = overall
    # No column change needed — just update the model enum
  end
end
