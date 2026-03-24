module Types
  class ReportType < Types::BaseObject
    field :id, ID, null: false
    field :report_type, String, null: false
    field :period_start, GraphQL::Types::ISO8601Date
    field :period_end, GraphQL::Types::ISO8601Date
    field :ai_summary, String
    field :key_insights, String
    field :improvement_areas, String
    field :stats_snapshot, GraphQL::Types::JSON
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
