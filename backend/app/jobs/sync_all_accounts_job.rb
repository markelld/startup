class SyncAllAccountsJob
  include Sidekiq::Job

  sidekiq_options queue: :sync, retry: 1

  def perform
    Account.joins(:broker_connection)
      .where(broker_connections: { status: :active })
      .find_each do |account|
        SyncTradovateTradesJob.perform_async(account.id, Date.current.to_s)
      end
  end
end
