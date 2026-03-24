class SendJournalReminderJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find_by(id: user_id)
    return unless user&.sms_eligible?

    name = user.display_name.presence || 'trader'

    TwilioService.send_sms(to: user.phone, body: "Thanks #{name}.")
    TwilioService.send_sms(
      to: user.phone,
      body: "Don't forget to log your chart screenshots for today → zone.io/journal"
    )
  end
end
