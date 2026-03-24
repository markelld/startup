module Mutations
  class ImportCsv < Types::BaseMutation
    argument :account_id, ID, required: true
    argument :csv_data, String, required: true
    argument :platform, String, required: false

    field :trades_imported, Integer, null: false
    field :errors, [String], null: false

    def resolve(account_id:, csv_data:, platform: nil)
      user = context[:current_user]
      return { trades_imported: 0, errors: ['Not authenticated'] } unless user

      account = user.accounts.find_by(id: account_id)
      return { trades_imported: 0, errors: ['Account not found'] } unless account

      result = CsvImportService.new(account, csv_data, platform: platform).import!
      { trades_imported: result[:trades_imported], errors: result[:errors] }
    rescue => e
      { trades_imported: 0, errors: [e.message] }
    end
  end
end
