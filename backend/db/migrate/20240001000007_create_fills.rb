class CreateFills < ActiveRecord::Migration[8.1]
  def change
    create_table :fills, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :order, type: :uuid, null: false, foreign_key: true
      t.references :account, type: :uuid, null: false, foreign_key: true
      t.string :broker_fill_id, null: false
      t.string :instrument
      t.integer :qty
      t.decimal :fill_price, precision: 15, scale: 4
      t.decimal :fees, precision: 15, scale: 2, default: 0
      t.string :action  # Buy / Sell
      t.datetime :timestamp

      t.timestamps
    end

    add_index :fills, :broker_fill_id, unique: true
  end
end
