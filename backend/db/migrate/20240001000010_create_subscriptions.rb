class CreateSubscriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :subscriptions, id: :uuid, default: "gen_random_uuid()" do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true, index: false
      t.string :stripe_customer_id
      t.string :stripe_subscription_id
      t.string :stripe_price_id
      t.integer :status, default: 0  # 0=trialing, 1=active, 2=past_due, 3=canceled, 4=incomplete
      t.datetime :current_period_start
      t.datetime :current_period_end
      t.boolean :cancel_at_period_end, default: false
      t.datetime :trial_ends_at

      t.timestamps
    end

    add_index :subscriptions, :user_id, unique: true
    add_index :subscriptions, :stripe_subscription_id, unique: true
    add_index :subscriptions, :stripe_customer_id
  end
end
