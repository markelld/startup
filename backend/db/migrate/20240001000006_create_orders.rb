class CreateOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :trade, type: :uuid, null: false, foreign_key: true
      t.references :account, type: :uuid, null: false, foreign_key: true
      t.string :broker_order_id
      t.integer :side, default: 0  # 0=buy, 1=sell
      t.integer :order_type, default: 0  # 0=market, 1=limit, 2=stop
      t.integer :quantity
      t.decimal :price, precision: 15, scale: 4
      t.integer :status, default: 0  # 0=pending, 1=filled, 2=cancelled, 3=partial
      t.datetime :placed_at

      t.timestamps
    end

  end
end
