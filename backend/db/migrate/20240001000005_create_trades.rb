class CreateTrades < ActiveRecord::Migration[8.1]
  def change
    create_table :trades, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :trading_session, type: :uuid, null: false, foreign_key: true
      t.references :account, type: :uuid, null: false, foreign_key: true
      t.string :broker_trade_id, null: false
      t.string :instrument
      t.integer :side, default: 0  # 0=long, 1=short
      t.integer :quantity, default: 0
      t.decimal :entry_price, precision: 15, scale: 4
      t.decimal :exit_price, precision: 15, scale: 4
      t.decimal :stop_loss, precision: 15, scale: 4
      t.decimal :net_pnl, precision: 15, scale: 2, default: 0
      t.string :grade
      t.boolean :is_revenge_trade, default: false
      t.string :emotion
      t.string :screenshot_url
      t.decimal :r_multiple, precision: 8, scale: 4
      t.integer :duration_minutes
      t.datetime :entered_at
      t.datetime :exited_at
      t.integer :status, default: 0  # 0=open, 1=closed
      t.text :notes

      # Grade scores from FastAPI
      t.decimal :setup_score, precision: 5, scale: 2
      t.decimal :entry_score, precision: 5, scale: 2
      t.decimal :risk_score, precision: 5, scale: 2
      t.decimal :mgmt_score, precision: 5, scale: 2
      t.text :coaching_notes

      t.timestamps
    end

    add_index :trades, :broker_trade_id, unique: true
    add_index :trades, :entered_at
    add_index :trades, [:account_id, :status]
  end
end
