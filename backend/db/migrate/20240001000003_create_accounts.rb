class CreateAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :accounts, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.references :broker_connection, type: :uuid, null: false, foreign_key: true
      t.string :broker_account_id, null: false
      t.string :name
      t.integer :account_type, default: 0  # 0=sim, 1=live, 2=prop
      t.string :firm_name
      t.decimal :balance, precision: 15, scale: 2, default: 0
      t.decimal :buying_power, precision: 15, scale: 2, default: 0
      t.jsonb :rules, default: {}

      t.timestamps
    end

    add_index :accounts, :broker_account_id, unique: true
  end
end
