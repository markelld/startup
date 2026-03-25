class TwilioWebhooksController < ApplicationController
  def inbound
    # Validate the request came from Twilio
    unless valid_twilio_request?
      render plain: 'Forbidden', status: :forbidden
      return
    end

    from  = params['From']
    body  = params['Body'].to_s.strip

    user = User.find_by(phone: from)
    unless user
      render plain: '', status: :ok
      return
    end

    # Save or update today's recap (upsert so double-replies overwrite)
    DailyRecap.find_or_initialize_by(user: user, recap_date: Date.current)
              .update!(message_text: body)

    # Fire follow-up messages immediately
    SendJournalReminderJob.perform_later(user.id)

    render plain: '', status: :ok
  end

  private

  def valid_twilio_request?
    return true if Rails.env.development? # skip sig check locally

    validator = Twilio::Security::RequestValidator.new(ENV['TWILIO_AUTH_TOKEN'])
    url       = request.original_url
    params_h  = request.request_parameters
    signature = request.headers['X-Twilio-Signature'].to_s

    validator.validate(url, params_h, signature)
  end
end
