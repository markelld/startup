import { gql } from '@apollo/client'

export const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        displayName
      }
      errors
    }
  }
`

export const GOOGLE_SIGN_IN = gql`
  mutation GoogleSignIn($idToken: String!) {
    googleSignIn(input: { idToken: $idToken }) {
      token
      user {
        id
        email
        displayName
      }
      errors
    }
  }
`

export const SIGN_UP = gql`
  mutation SignUp($email: String!, $password: String!, $displayName: String) {
    signUp(input: { email: $email, password: $password, displayName: $displayName }) {
      token
      user {
        id
        email
        displayName
      }
      errors
    }
  }
`

export const SIGN_OUT = gql`
  mutation SignOut {
    signOut(input: {}) {
      success
    }
  }
`

export const CONNECT_TRADOVATE = gql`
  mutation ConnectTradovate($apiKey: String!, $demo: Boolean) {
    connectTradovate(input: { apiKey: $apiKey, demo: $demo }) {
      brokerConnection {
        id
        broker
        status
        demoMode
      }
      errors
    }
  }
`

export const SYNC_TRADES = gql`
  mutation SyncTrades($accountId: ID!, $date: ISO8601Date) {
    syncTrades(input: { accountId: $accountId, date: $date }) {
      enqueued
      errors
    }
  }
`

export const UPDATE_TRADE_JOURNAL = gql`
  mutation UpdateTradeJournal($id: ID!, $notes: String, $emotion: String, $screenshotUrl: String, $stopLoss: Float, $targetPrice: Float) {
    updateTradeJournal(input: { id: $id, notes: $notes, emotion: $emotion, screenshotUrl: $screenshotUrl, stopLoss: $stopLoss, targetPrice: $targetPrice }) {
      trade {
        id
        notes
        emotion
        screenshotUrl
        stopLoss
        targetPrice
      }
      errors
    }
  }
`

export const GRADE_SESSION = gql`
  mutation GradeSession($date: ISO8601Date!) {
    gradeSession(input: { date: $date }) {
      trades {
        id
        grade
        setupScore
        entryScore
        riskScore
        mgmtScore
        compositeScore
        coachingNotes
        offPlaybook
      }
      errors
    }
  }
`

export const GRADE_TRADE = gql`
  mutation GradeTrade($id: ID!) {
    gradeTrade(input: { id: $id }) {
      trade {
        id
        grade
        setupScore
        entryScore
        riskScore
        mgmtScore
        compositeScore
        coachingNotes
        offPlaybook
      }
      errors
    }
  }
`

export const GENERATE_DAILY_REPORT = gql`
  mutation GenerateDailyReport($date: ISO8601Date) {
    generateDailyReport(input: { date: $date }) {
      report {
        id
        reportType
        aiSummary
        keyInsights
        improvementAreas
      }
      errors
    }
  }
`

export const GENERATE_PERIOD_REPORT = gql`
  mutation GeneratePeriodReport($periodType: String!, $periodStart: ISO8601Date!) {
    generatePeriodReport(input: { periodType: $periodType, periodStart: $periodStart }) {
      report {
        id
        reportType
        periodStart
        periodEnd
        aiSummary
        keyInsights
        improvementAreas
        statsSnapshot
      }
      errors
    }
  }
`

export const GENERATE_OVERALL_REPORT = gql`
  mutation GenerateOverallReport {
    generateOverallReport(input: {}) {
      report {
        id
        reportType
        aiSummary
        keyInsights
        improvementAreas
        statsSnapshot
      }
      errors
    }
  }
`

export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession {
    createCheckoutSession(input: {}) {
      url
      errors
    }
  }
`

export const CREATE_PORTAL_SESSION = gql`
  mutation CreatePortalSession {
    createPortalSession(input: {}) {
      url
      errors
    }
  }
`

export const UPDATE_ACCOUNT_RULES = gql`
  mutation UpdateAccountRules($id: ID!, $dailyLossLimit: Float, $maxContracts: Int, $maxTradesPerSession: Int, $maxConsecutiveLosses: Int) {
    updateAccountRules(input: {
      id: $id,
      dailyLossLimit: $dailyLossLimit,
      maxContracts: $maxContracts,
      maxTradesPerSession: $maxTradesPerSession,
      maxConsecutiveLosses: $maxConsecutiveLosses
    }) {
      account {
        id
        rules
      }
      errors
    }
  }
`

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($firmName: String!, $name: String!, $accountType: String!, $balance: Float!, $commissionPerContract: Float) {
    createAccount(input: { firmName: $firmName, name: $name, accountType: $accountType, balance: $balance, commissionPerContract: $commissionPerContract }) {
      account {
        id
        name
        firmName
        accountType
        balance
        commissionPerContract
      }
      errors
    }
  }
`

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: ID!, $firmName: String, $name: String, $accountType: String, $balance: Float, $commissionPerContract: Float) {
    updateAccount(input: { id: $id, firmName: $firmName, name: $name, accountType: $accountType, balance: $balance, commissionPerContract: $commissionPerContract }) {
      account {
        id
        name
        firmName
        accountType
        balance
        commissionPerContract
      }
      errors
    }
  }
`

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(input: { id: $id }) {
      success
      errors
    }
  }
`

export const DELETE_TRADE = gql`
  mutation DeleteTrade($id: ID!) {
    deleteTrade(input: { id: $id }) {
      success
      errors
    }
  }
`

export const IMPORT_CSV = gql`
  mutation ImportCsv($accountId: ID!, $csvData: String!, $platform: String) {
    importCsv(input: { accountId: $accountId, csvData: $csvData, platform: $platform }) {
      tradesImported
      errors
    }
  }
`

export const SAVE_TRADING_PLAN = gql`
  mutation SaveTradingPlan($playbook: JSON, $rules: JSON, $weeklyIntention: String) {
    saveTradingPlan(input: { playbook: $playbook, rules: $rules, weeklyIntention: $weeklyIntention }) {
      tradingPlan {
        id
        playbook
        rules
        weeklyIntention
      }
      errors
    }
  }
`

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(input: { currentPassword: $currentPassword, newPassword: $newPassword }) {
      success
      errors
    }
  }
`

export const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings($displayName: String, $phone: String, $smsEnabled: Boolean) {
    updateUserSettings(input: { displayName: $displayName, phone: $phone, smsEnabled: $smsEnabled }) {
      user {
        id
        email
        displayName
        phone
        smsEnabled
      }
      errors
    }
  }
`

export const CREATE_TRADE = gql`
  mutation CreateTrade(
    $instrument: String!
    $side: String!
    $quantity: Int!
    $entryPrice: Float!
    $exitPrice: Float
    $stopLoss: Float
    $targetPrice: Float
    $netPnl: Float
    $enteredAt: ISO8601DateTime
    $exitedAt: ISO8601DateTime
    $notes: String
    $emotion: String
    $sessionDate: ISO8601Date
  ) {
    createTrade(input: {
      instrument: $instrument
      side: $side
      quantity: $quantity
      entryPrice: $entryPrice
      exitPrice: $exitPrice
      stopLoss: $stopLoss
      targetPrice: $targetPrice
      netPnl: $netPnl
      enteredAt: $enteredAt
      exitedAt: $exitedAt
      notes: $notes
      emotion: $emotion
      sessionDate: $sessionDate
    }) {
      trade {
        id
        instrument
        side
        quantity
        entryPrice
        exitPrice
        netPnl
        grade
        emotion
        notes
        enteredAt
        exitedAt
        status
      }
      errors
    }
  }
`
