class CreateBrokerConnections < ActiveRecord::Migration[8.1]
  def change
    create_table :broker_connections, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :broker, null: false, default: "tradovate"
      t.string :encrypted_access_token
      t.string :encrypted_access_token_iv
      t.string :encrypted_refresh_token
      t.string :encrypted_refresh_token_iv
      t.datetime :token_expires_at
      t.boolean :demo_mode, default: false
      t.integer :status, default: 0  # 0=pending, 1=active, 2=error

      t.timestamps
    end

  end
end
