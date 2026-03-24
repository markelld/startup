class GenerateAllWeeklyReportsJob
  include Sidekiq::Job

  sidekiq_options queue: :ai, retry: 1

  def perform
    week_start = Date.current.beginning_of_week.to_s

    Account.joins(:broker_connection)
      .where(broker_connections: { status: :active })
      .find_each do |account|
        GenerateWeeklyReportJob.perform_async(account.id, week_start)
      end
  end
end
