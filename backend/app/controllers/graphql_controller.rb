class GraphqlController < ApplicationController
  skip_before_action :authenticate_user!

  def execute
    variables = prepare_variables(params[:variables])
    query = params[:query]
    operation_name = params[:operationName]
    context = {
      current_user: current_user_from_token,
      selected_account_id: request.headers["X-Account-ID"],
      channel: params[:channel]
    }

    result = ZoneSchema.execute(
      query,
      variables: variables,
      context: context,
      operation_name: operation_name
    )

    render json: result
  rescue StandardError => e
    raise e unless Rails.env.development?
    handle_error_in_development(e)
  end

  private

  def current_user_from_token
    auth_header = request.headers["Authorization"]
    return nil unless auth_header&.start_with?("Bearer ")

    token = auth_header.split(" ").last
    return nil unless token

    payload = Warden::JWTAuth::TokenDecoder.new.call(token)
    user_id = payload["sub"]
    jti     = payload["jti"]

    user = User.find_by(id: user_id)
    return nil unless user
    return nil if user.jti != jti

    user
  rescue JWT::DecodeError, JWT::ExpiredSignature
    nil
  end

  def prepare_variables(variables_param)
    case variables_param
    when String
      variables_param.present? ? JSON.parse(variables_param) || {} : {}
    when Hash
      variables_param
    when ActionController::Parameters
      variables_param.to_unsafe_hash
    when nil
      {}
    else
      raise ArgumentError, "Unexpected parameter: #{variables_param}"
    end
  end

  def handle_error_in_development(err)
    logger.error err.message
    logger.error err.backtrace.join("\n")
    render json: {
      errors: [{ message: err.message, backtrace: err.backtrace }],
      data: {}
    }, status: 500
  end
end
