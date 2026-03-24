class AddTargetPriceToTrades < ActiveRecord::Migration[8.1]
  def change
    add_column :trades, :target_price, :decimal
  end
end
