class AddPhoneToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :phone, :string
    add_column :users, :sms_enabled, :boolean, default: false, null: false
    add_index :users, :phone, unique: true, where: 'phone IS NOT NULL'
  end
end
