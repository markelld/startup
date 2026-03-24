class ApplicationController < ActionController::API
  before_action :authenticate_user!

  def require_active_subscription
    return if current_user.active_or_trialing?
    render json: { error: "Active subscription required" }, status: :payment_required
  end

  private

  def current_user
    @current_user ||= warden.authenticate(scope: :user)
  end
end
