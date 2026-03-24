class AllowNullBrokerAccountId < ActiveRecord::Migration[8.1]
  def change
    change_column_null :accounts, :broker_account_id, true
  end
end
