# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_23_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "accounts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "account_type", default: 0
    t.decimal "balance", precision: 15, scale: 2, default: "0.0"
    t.string "broker_account_id"
    t.uuid "broker_connection_id"
    t.decimal "buying_power", precision: 15, scale: 2, default: "0.0"
    t.decimal "commission_per_contract", precision: 8, scale: 4, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.string "firm_name"
    t.string "name"
    t.jsonb "rules", default: {}
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["broker_account_id"], name: "index_accounts_on_broker_account_id", unique: true
    t.index ["broker_connection_id"], name: "index_accounts_on_broker_connection_id"
    t.index ["user_id"], name: "index_accounts_on_user_id"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "broker_connections", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "broker", default: "tradovate", null: false
    t.datetime "created_at", null: false
    t.boolean "demo_mode", default: false
    t.string "encrypted_access_token"
    t.string "encrypted_access_token_iv"
    t.string "encrypted_refresh_token"
    t.string "encrypted_refresh_token_iv"
    t.integer "status", default: 0
    t.datetime "token_expires_at"
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["user_id"], name: "index_broker_connections_on_user_id"
  end

  create_table "daily_recaps", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "message_text", null: false
    t.date "recap_date", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["user_id", "recap_date"], name: "index_daily_recaps_on_user_id_and_recap_date", unique: true
    t.index ["user_id"], name: "index_daily_recaps_on_user_id"
  end

  create_table "fills", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.string "action"
    t.string "broker_fill_id", null: false
    t.datetime "created_at", null: false
    t.decimal "fees", precision: 15, scale: 2, default: "0.0"
    t.decimal "fill_price", precision: 15, scale: 4
    t.string "instrument"
    t.uuid "order_id", null: false
    t.integer "qty"
    t.datetime "timestamp"
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_fills_on_account_id"
    t.index ["broker_fill_id"], name: "index_fills_on_broker_fill_id", unique: true
    t.index ["order_id"], name: "index_fills_on_order_id"
  end

  create_table "orders", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.string "broker_order_id"
    t.datetime "created_at", null: false
    t.integer "order_type", default: 0
    t.datetime "placed_at"
    t.decimal "price", precision: 15, scale: 4
    t.integer "quantity"
    t.integer "side", default: 0
    t.integer "status", default: 0
    t.uuid "trade_id", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_orders_on_account_id"
    t.index ["trade_id"], name: "index_orders_on_trade_id"
  end

  create_table "reports", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.text "ai_summary"
    t.datetime "created_at", null: false
    t.text "improvement_areas"
    t.text "key_insights"
    t.date "period_end"
    t.date "period_start"
    t.integer "report_type", default: 0, null: false
    t.jsonb "stats_snapshot", default: {}
    t.datetime "updated_at", null: false
    t.index ["account_id", "period_start"], name: "index_reports_on_account_id_and_period_start"
    t.index ["account_id", "report_type"], name: "index_reports_on_account_id_and_report_type"
    t.index ["account_id"], name: "index_reports_on_account_id"
  end

  create_table "rule_violations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.decimal "impact_pnl", precision: 15, scale: 2
    t.integer "rule_type", null: false
    t.decimal "severity", precision: 5, scale: 2
    t.uuid "trade_id"
    t.uuid "trading_session_id", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_rule_violations_on_account_id"
    t.index ["trade_id"], name: "index_rule_violations_on_trade_id"
    t.index ["trading_session_id", "rule_type"], name: "index_rule_violations_on_trading_session_id_and_rule_type"
    t.index ["trading_session_id"], name: "index_rule_violations_on_trading_session_id"
  end

  create_table "subscriptions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "cancel_at_period_end", default: false
    t.datetime "created_at", null: false
    t.datetime "current_period_end"
    t.datetime "current_period_start"
    t.integer "status", default: 0
    t.string "stripe_customer_id"
    t.string "stripe_price_id"
    t.string "stripe_subscription_id"
    t.datetime "trial_ends_at"
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["stripe_customer_id"], name: "index_subscriptions_on_stripe_customer_id"
    t.index ["stripe_subscription_id"], name: "index_subscriptions_on_stripe_subscription_id", unique: true
    t.index ["user_id"], name: "index_subscriptions_on_user_id", unique: true
  end

  create_table "trades", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.string "broker_trade_id", null: false
    t.text "coaching_notes"
    t.decimal "composite_score"
    t.datetime "created_at", null: false
    t.integer "duration_minutes"
    t.string "emotion"
    t.datetime "entered_at"
    t.decimal "entry_price", precision: 15, scale: 4
    t.decimal "entry_score", precision: 5, scale: 2
    t.decimal "exit_price", precision: 15, scale: 4
    t.datetime "exited_at"
    t.string "grade"
    t.string "instrument"
    t.boolean "is_revenge_trade", default: false
    t.decimal "mgmt_score", precision: 5, scale: 2
    t.decimal "net_pnl", precision: 15, scale: 2, default: "0.0"
    t.text "notes"
    t.boolean "off_playbook", default: false, null: false
    t.integer "quantity", default: 0
    t.decimal "r_multiple", precision: 8, scale: 4
    t.decimal "risk_score", precision: 5, scale: 2
    t.string "screenshot_url"
    t.decimal "setup_score", precision: 5, scale: 2
    t.integer "side", default: 0
    t.integer "status", default: 0
    t.decimal "stop_loss", precision: 15, scale: 4
    t.decimal "target_price"
    t.uuid "trading_session_id", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id", "broker_trade_id"], name: "index_trades_on_account_id_and_broker_trade_id", unique: true
    t.index ["account_id", "status"], name: "index_trades_on_account_id_and_status"
    t.index ["account_id"], name: "index_trades_on_account_id"
    t.index ["entered_at"], name: "index_trades_on_entered_at"
    t.index ["trading_session_id"], name: "index_trades_on_trading_session_id"
  end

  create_table "trading_plans", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "playbook", default: []
    t.jsonb "rules", default: []
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.text "weekly_intention"
    t.index ["user_id"], name: "index_trading_plans_on_user_id"
  end

  create_table "trading_sessions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.jsonb "analytics_payload", default: {}
    t.datetime "created_at", null: false
    t.decimal "discipline_score", precision: 5, scale: 2
    t.integer "market_session", default: 0
    t.decimal "net_pnl", precision: 15, scale: 2, default: "0.0"
    t.date "session_date", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id", "session_date"], name: "index_trading_sessions_on_account_id_and_session_date", unique: true
    t.index ["account_id"], name: "index_trading_sessions_on_account_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name"
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "google_uid"
    t.string "jti", null: false
    t.string "phone"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.boolean "sms_enabled", default: false, null: false
    t.string "timezone", default: "America/New_York"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["google_uid"], name: "index_users_on_google_uid", unique: true
    t.index ["jti"], name: "index_users_on_jti", unique: true
    t.index ["phone"], name: "index_users_on_phone", unique: true, where: "(phone IS NOT NULL)"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "accounts", "broker_connections"
  add_foreign_key "accounts", "users"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "broker_connections", "users"
  add_foreign_key "daily_recaps", "users"
  add_foreign_key "fills", "accounts"
  add_foreign_key "fills", "orders"
  add_foreign_key "orders", "accounts"
  add_foreign_key "orders", "trades"
  add_foreign_key "reports", "accounts"
  add_foreign_key "rule_violations", "accounts"
  add_foreign_key "rule_violations", "trades"
  add_foreign_key "rule_violations", "trading_sessions"
  add_foreign_key "subscriptions", "users"
  add_foreign_key "trades", "accounts"
  add_foreign_key "trades", "trading_sessions"
  add_foreign_key "trading_plans", "users"
  add_foreign_key "trading_sessions", "accounts"
end
