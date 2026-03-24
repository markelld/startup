class AllowNullBrokerConnectionId < ActiveRecord::Migration[8.1]
  def change
    change_column_null :accounts, :broker_connection_id, true
  end
end
