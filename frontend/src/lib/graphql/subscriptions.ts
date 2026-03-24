import { gql } from '@apollo/client'

export const ON_TRADE_SYNCED = gql`
  subscription OnTradeSynced($accountId: ID!) {
    tradeSynced(accountId: $accountId) {
      id
      instrument
      side
      netPnl
      grade
      enteredAt
    }
  }
`

export const ON_REPORT_GENERATED = gql`
  subscription OnReportGenerated($accountId: ID!) {
    reportGenerated(accountId: $accountId) {
      id
      reportType
      aiSummary
      keyInsights
      improvementAreas
      statsSnapshot
    }
  }
`

export const ON_SESSION_UPDATED = gql`
  subscription OnSessionUpdated($sessionId: ID!) {
    sessionUpdated(sessionId: $sessionId) {
      id
      netPnl
      disciplineScore
      winRate
      profitFactor
      tradeCount
    }
  }
`
