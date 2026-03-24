class CreateRuleViolations < ActiveRecord::Migration[8.1]
  def change
    create_table :rule_violations, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :trading_session, type: :uuid, null: false, foreign_key: true
      t.references :trade, type: :uuid, null: true, foreign_key: true
      t.references :account, type: :uuid, null: false, foreign_key: true
      t.integer :rule_type, null: false  # 0=daily_loss, 1=max_size, 2=revenge_trade, 3=overtrading, 4=consecutive_losses
      t.text :description
      t.decimal :severity, precision: 5, scale: 2
      t.decimal :impact_pnl, precision: 15, scale: 2

      t.timestamps
    end

    add_index :rule_violations, [:trading_session_id, :rule_type]
  end
end
