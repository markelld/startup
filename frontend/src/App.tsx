import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { useAuthStore } from './stores/authStore'
import { useAccountStore } from './stores/accountStore'
import { CURRENT_ACCOUNT } from './lib/graphql/queries'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import ScreenshotJournalPage from './pages/ScreenshotJournalPage'
import TradeGradePage from './pages/TradeGradePage'
import WeeklyReportPage from './pages/WeeklyReportPage'
import ShareCardPage from './pages/ShareCardPage'
import SettingsPage from './pages/SettingsPage'
import TradingPlanPage from './pages/TradingPlanPage'
import AuthPage from './pages/AuthPage'
import LandingPage from './pages/LandingPage'

function AppContent() {
  const { isAuthenticated } = useAuthStore()
  const { account, setAccount, clearAccount } = useAccountStore()

  useQuery(CURRENT_ACCOUNT, {
    skip: !isAuthenticated,
    onCompleted: (d) => {
      if (d?.currentAccount) setAccount(d.currentAccount)
      else clearAccount()
    },
  })

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      {/* key forces full remount of all page components when account switches */}
      <Routes key={account?.id ?? 'no-account'}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/journal" element={<ScreenshotJournalPage />} />
        <Route path="/grade" element={<TradeGradePage />} />
        <Route path="/reports" element={<WeeklyReportPage />} />
        <Route path="/share" element={<ShareCardPage />} />
        <Route path="/plan" element={<TradingPlanPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
