class SendDailyRecapJob < ApplicationJob
  queue_as :default

  def perform
    User.where(sms_enabled: true).where.not(phone: nil).find_each do |user|
      name = user.display_name.presence || 'trader'
      TwilioService.send_sms(
        to: user.phone,
        body: "Hey #{name} — how did your trading day go?"
      )
    end
  end
end
