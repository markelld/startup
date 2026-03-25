module Types
  class MutationType < Types::BaseObject
    field :sign_in, mutation: Mutations::SignIn
    field :sign_up, mutation: Mutations::SignUp
    field :sign_out, mutation: Mutations::SignOut
    field :google_sign_in, mutation: Mutations::GoogleSignIn
    field :connect_tradovate, mutation: Mutations::ConnectTradovate
    field :sync_trades, mutation: Mutations::SyncTrades
    field :update_trade_journal, mutation: Mutations::UpdateTradeJournal
    field :grade_trade, mutation: Mutations::GradeTrade
    field :grade_session, mutation: Mutations::GradeSession
    field :generate_daily_report, mutation: Mutations::GenerateDailyReport
    field :generate_overall_report, mutation: Mutations::GenerateOverallReport
    field :generate_period_report, mutation: Mutations::GeneratePeriodReport
    field :update_account_rules, mutation: Mutations::UpdateAccountRules
    field :create_checkout_session, mutation: Mutations::CreateCheckoutSession
    field :create_portal_session, mutation: Mutations::CreatePortalSession
    field :create_trade, mutation: Mutations::CreateTrade
    field :create_account, mutation: Mutations::CreateAccount
    field :update_account, mutation: Mutations::UpdateAccount
    field :delete_account, mutation: Mutations::DeleteAccount
    field :import_csv, mutation: Mutations::ImportCsv
    field :update_user_settings, mutation: Mutations::UpdateUserSettings
    field :save_trading_plan, mutation: Mutations::SaveTradingPlan
    field :change_password,   mutation: Mutations::ChangePassword
    field :delete_trade,      mutation: Mutations::DeleteTrade
  end
end
