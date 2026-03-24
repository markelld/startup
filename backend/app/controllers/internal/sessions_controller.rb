module Internal
  class SessionsController < ApplicationController
    skip_before_action :authenticate_user!
    before_action :verify_internal_token

    def index
      account = Account.find(params[:account_id])
      lookback = (params[:lookback_days] || 30).to_i

      sessions = account.trading_sessions
        .where(session_date: lookback.days.ago..Date.current)
        .order(session_date: :desc)
        .includes(:trades)

      render json: sessions.map { |s| serialize_session(s) }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Account not found" }, status: :not_found
    end

    private

    def verify_internal_token
      token = request.headers["X-Internal-Token"]
      unless token == ENV["INTERNAL_API_TOKEN"]
        render json: { error: "Unauthorized" }, status: :unauthorized
      end
    end

    def serialize_session(session)
      {
        id: session.id,
        session_date: session.session_date,
        net_pnl: session.net_pnl,
        discipline_score: session.discipline_score,
        analytics_payload: session.analytics_payload,
        trades: session.trades.where(status: :closed).map { |t|
          {
            id: t.id,
            instrument: t.instrument,
            side: t.side,
            quantity: t.quantity,
            entry_price: t.entry_price,
            exit_price: t.exit_price,
            stop_loss: t.stop_loss,
            net_pnl: t.net_pnl,
            entered_at: t.entered_at,
            exited_at: t.exited_at,
            duration_minutes: t.duration_minutes,
            r_multiple: t.r_multiple
          }
        }
      }
    end
  end
end
