class SyncTradovateTradesJob
  include Sidekiq::Job

  sidekiq_options queue: :sync, retry: 3

  def perform(account_id, date_str)
    account = Account.find(account_id)
    date = Date.parse(date_str)

    session = SyncService.new(account).sync_trades_for_date!(date)
    return unless session

    CheckRuleViolationsJob.perform_async(account_id, session.id)

    ZoneSchema.subscriptions.trigger(
      "sessionUpdated",
      { session_id: session.id },
      session
    )
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error("SyncJob: Account #{account_id} not found: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("SyncJob error for account #{account_id}: #{e.message}")
    raise
  end
end
