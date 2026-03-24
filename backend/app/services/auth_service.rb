class AuthService
  TRADOVATE_BASE = ENV.fetch("TRADOVATE_API_URL", "https://demo.tradovateapi.com/v1")

  def initialize(user)
    @user = user
  end

  def authenticate!(api_key:, demo: false)
    response = HTTParty.post(
      "#{TRADOVATE_BASE}/auth/accesstokenrequest",
      body: {
        name: ENV["TRADOVATE_USERNAME"],
        password: ENV["TRADOVATE_PASSWORD"],
        appId: ENV["TRADOVATE_APP_ID"],
        appVersion: "1.0",
        cid: ENV["TRADOVATE_CID"],
        sec: api_key
      }.to_json,
      headers: { "Content-Type" => "application/json" }
    )

    raise "Tradovate auth failed: #{response.body}" unless response.success?

    data = JSON.parse(response.body)

    conn = @user.broker_connections.find_or_initialize_by(broker: "tradovate")
    conn.access_token = data["accessToken"]
    conn.refresh_token = data["mdAccessToken"]
    conn.token_expires_at = Time.current + 24.hours
    conn.demo_mode = demo
    conn.status = :active
    conn.save!

    sync_accounts!(conn)
    conn
  end

  def refresh_token!(connection)
    response = HTTParty.post(
      "#{TRADOVATE_BASE}/auth/renewaccesstoken",
      headers: {
        "Content-Type" => "application/json",
        "Authorization" => "Bearer #{connection.access_token}"
      }
    )

    return unless response.success?

    data = JSON.parse(response.body)
    connection.update!(
      access_token: data["accessToken"],
      token_expires_at: Time.current + 24.hours
    )
  end

  private

  def sync_accounts!(connection)
    response = HTTParty.get(
      "#{TRADOVATE_BASE}/account/list",
      headers: {
        "Authorization" => "Bearer #{connection.access_token}",
        "Content-Type" => "application/json"
      }
    )

    return unless response.success?

    accounts = JSON.parse(response.body)
    accounts.each do |acct|
      @user.accounts.find_or_create_by(broker_account_id: acct["id"].to_s) do |a|
        a.broker_connection = connection
        a.name = acct["name"]
        a.account_type = acct["accountType"]&.downcase == "sim" ? :sim : :live
        a.balance = acct["balance"].to_f
        a.buying_power = acct["marginBalance"].to_f
      end
    end
  end
end
