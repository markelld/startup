class UserMailer < ApplicationMailer
  default from: ENV.fetch('MAILER_FROM', 'noreply@zonehq.app')

  def reset_password_email(user, reset_url)
    @user = user
    @reset_url = reset_url
    mail(to: @user.email, subject: 'Reset your Zone password')
  end
end
