class AddOffPlaybookToTrades < ActiveRecord::Migration[8.1]
  def change
    add_column :trades, :off_playbook, :boolean, default: false, null: false
  end
end
