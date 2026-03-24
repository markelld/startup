class TwilioService
  def self.send_sms(to:, body:)
    return if to.blank?

    client = Twilio::REST::Client.new(
      ENV['TWILIO_ACCOUNT_SID'],
      ENV['TWILIO_AUTH_TOKEN']
    )

    client.messages.create(
      from: ENV['TWILIO_PHONE_NUMBER'],
      to: to,
      body: body
    )
  rescue Twilio::REST::TwilioError => e
    Rails.logger.error "[TwilioService] Failed to send SMS to #{to}: #{e.message}"
    nil
  end
end
