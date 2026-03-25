import { gql } from '@apollo/client'

export const ME = gql`
  query Me {
    me {
      id
      email
      displayName
      phone
      smsEnabled
    }
  }
`

export const MY_TRADING_PLAN = gql`
  query MyTradingPlan {
    myTradingPlan {
      id
      playbook
      rules
      weeklyIntention
      updatedAt
    }
  }
`

export const LIST_ACCOUNTS = gql`
  query ListAccounts {
    accounts {
      id
      name
      accountType
      firmName
      balance
      buyingPower
      dailyPnl
      rules
      commissionPerContract
    }
  }
`

export const CURRENT_ACCOUNT = gql`
  query CurrentAccount {
    currentAccount {
      id
      name
      accountType
      firmName
      balance
      buyingPower
      dailyPnl
      rules
      totalPnl
      currentBalance
      percentReturn
      totalTrades
      tradingDays
      firstSessionDate
      winRate
      profitFactor
      avgDayPnl
      bestDayPnl
      worstDayPnl
      avgDisciplineScore
      entryPrecision
      stopDiscipline
      tradeManagement
      revengeTradeRate
      recentViolations
      tradingSessions {
        id
        sessionDate
        netPnl
      }
      recentTrades {
        id
        instrument
        side
        quantity
        entryPrice
        exitPrice
        stopLoss
        targetPrice
        netPnl
        grade
        rMultiple
        durationMinutes
        enteredAt
        exitedAt
        status
        isRevengeTrade
        emotion
        screenshotUrl
        coachingNotes
        setupScore
        entryScore
        riskScore
        mgmtScore
        compositeScore
      }
    }
  }
`

export const TODAY_SESSION = gql`
  query TodaySession($date: ISO8601Date) {
    tradingSession(date: $date) {
      id
      sessionDate
      marketSession
      netPnl
      disciplineScore
      winRate
      profitFactor
      tradeCount
      analyticsPayload
      trades {
        id
        brokerTradeId
        instrument
        side
        quantity
        entryPrice
        exitPrice
        stopLoss
        netPnl
        grade
        isRevengeTrade
        emotion
        screenshotUrl
        rMultiple
        durationMinutes
        enteredAt
        exitedAt
        status
        notes
        setupScore
        entryScore
        riskScore
        mgmtScore
        coachingNotes
        compositeScore
        offPlaybook
      }
      ruleViolations {
        id
        ruleType
        description
        severity
        impactPnl
      }
    }
  }
`

export const PAGINATED_TRADES = gql`
  query PaginatedTrades($limit: Int, $offset: Int) {
    trades(limit: $limit, offset: $offset) {
      id
      instrument
      side
      quantity
      entryPrice
      exitPrice
      stopLoss
      targetPrice
      netPnl
      grade
      rMultiple
      durationMinutes
      enteredAt
      exitedAt
      status
      isRevengeTrade
      emotion
      screenshotUrl
      coachingNotes
      setupScore
      entryScore
      riskScore
      mgmtScore
      compositeScore
    }
  }
`

export const TRADE_DETAIL = gql`
  query TradeDetail($id: ID!) {
    trade(id: $id) {
      id
      instrument
      side
      quantity
      entryPrice
      exitPrice
      stopLoss
      netPnl
      grade
      isRevengeTrade
      emotion
      screenshotUrl
      rMultiple
      durationMinutes
      enteredAt
      exitedAt
      notes
      setupScore
      entryScore
      riskScore
      mgmtScore
      coachingNotes
      compositeScore
    }
  }
`

export const LIST_REPORTS = gql`
  query ListReports($type: String, $limit: Int) {
    reports(type: $type, limit: $limit) {
      id
      reportType
      periodStart
      periodEnd
      aiSummary
      keyInsights
      improvementAreas
      statsSnapshot
      createdAt
    }
  }
`

export const WEEKLY_REPORT = gql`
  query WeeklyReport($weekOf: ISO8601Date!) {
    weeklyReport(weekOf: $weekOf) {
      id
      reportType
      periodStart
      periodEnd
      aiSummary
      keyInsights
      improvementAreas
      statsSnapshot
      createdAt
    }
  }
`

export const SESSION_ANALYTICS = gql`
  query SessionAnalytics($id: ID!) {
    sessionAnalytics(id: $id) {
      disciplineScore
      entryPrecision
      stopDiscipline
      tradeManagement
      earlyExitRate
      revengeTradeCount
      behavioralFlags
      timeOfDayBreakdown
      rDistribution
    }
  }
`

export const WEEK_SESSIONS = gql`
  query WeekSessions($weekOf: ISO8601Date!) {
    weekSessions(weekOf: $weekOf) {
      id
      sessionDate
      netPnl
      tradeCount
      winRate
      disciplineScore
    }
  }
`

export const MONTH_SESSIONS = gql`
  query MonthSessions($year: Int!, $month: Int!) {
    monthSessions(year: $year, month: $month) {
      id
      sessionDate
      netPnl
      tradeCount
      disciplineScore
    }
  }
`
