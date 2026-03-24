class CreateTradingSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :trading_sessions, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :account, type: :uuid, null: false, foreign_key: true
      t.date :session_date, null: false
      t.integer :market_session, default: 0  # 0=ny, 1=london, 2=asia, 3=pm
      t.decimal :net_pnl, precision: 15, scale: 2, default: 0
      t.decimal :discipline_score, precision: 5, scale: 2
      t.jsonb :analytics_payload, default: {}

      t.timestamps
    end

    add_index :trading_sessions, [:account_id, :session_date], unique: true
  end
end
