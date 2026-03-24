class AddCommissionPerContractToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :commission_per_contract, :decimal, precision: 8, scale: 4, default: 0.0, null: false
  end
end
