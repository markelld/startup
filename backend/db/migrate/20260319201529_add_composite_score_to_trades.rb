class AddCompositeScoreToTrades < ActiveRecord::Migration[8.1]
  def change
    add_column :trades, :composite_score, :decimal
  end
end
