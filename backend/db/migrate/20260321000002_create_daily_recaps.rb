class CreateDailyRecaps < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_recaps, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.date :recap_date, null: false
      t.text :message_text, null: false
      t.timestamps
    end

    add_index :daily_recaps, [:user_id, :recap_date], unique: true
  end
end
