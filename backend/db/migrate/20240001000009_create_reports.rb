class CreateReports < ActiveRecord::Migration[8.1]
  def change
    create_table :reports, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :account, type: :uuid, null: false, foreign_key: true
      t.integer :report_type, null: false, default: 0  # 0=daily, 1=weekly
      t.date :period_start
      t.date :period_end
      t.text :ai_summary
      t.text :key_insights
      t.text :improvement_areas
      t.jsonb :stats_snapshot, default: {}

      t.timestamps
    end

    add_index :reports, [:account_id, :report_type]
    add_index :reports, [:account_id, :period_start]
  end
end
