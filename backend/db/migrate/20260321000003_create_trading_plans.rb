class CreateTradingPlans < ActiveRecord::Migration[8.1]
  def change
    create_table :trading_plans, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.jsonb :playbook, default: []
      t.jsonb :rules, default: []
      t.text :weekly_intention

      t.timestamps
    end

    add_index :trading_plans, :user_id, unique: true, if_not_exists: true
  end
end
