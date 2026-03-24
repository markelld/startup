class ScopeBrokerTradeIdToAccount < ActiveRecord::Migration[8.1]
  def change
    remove_index :trades, :broker_trade_id, if_exists: true
    add_index :trades, [:account_id, :broker_trade_id], unique: true
  end
end
