class ScreenshotsController < ApplicationController
  skip_before_action :authenticate_user!
  before_action :authenticate_from_token!

  def create
    trade = current_account.trades.find(params[:trade_id])
    trade.screenshot.attach(params[:file])

    if trade.screenshot.attached?
      url = url_for(trade.screenshot)
      trade.update_column(:screenshot_url, url)
      render json: { url: url }
    else
      render json: { error: 'Upload failed' }, status: :unprocessable_entity
    end
  end

  private

  def authenticate_from_token!
    auth_header = request.headers['Authorization']
    return render json: { error: 'Unauthorized' }, status: :unauthorized unless auth_header&.start_with?('Bearer ')

    token = auth_header.split(' ').last
    payload = Warden::JWTAuth::TokenDecoder.new.call(token)
    user = User.find_by(id: payload['sub'])
    return render json: { error: 'Unauthorized' }, status: :unauthorized unless user&.jti == payload['jti']

    @current_user_from_token = user
  rescue JWT::DecodeError, JWT::ExpiredSignature
    render json: { error: 'Unauthorized' }, status: :unauthorized
  end

  def current_account
    selected_id = request.headers['X-Account-ID']
    accounts = @current_user_from_token.accounts
    selected_id.present? ? (accounts.find_by(id: selected_id) || accounts.first) : accounts.first
  end
end
