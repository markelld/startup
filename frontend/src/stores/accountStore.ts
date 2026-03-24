import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AccountRules {
  daily_loss_limit?: number
  max_contracts?: number
  max_trades_per_session?: number
  max_consecutive_losses?: number
}

interface Account {
  id: string
  name: string
  accountType: string
  firmName?: string
  balance: number
  buyingPower: number
  dailyPnl: number
  rules: AccountRules
}

interface AccountState {
  account: Account | null
  setAccount: (account: Account) => void
  clearAccount: () => void
}

const ACCOUNT_KEY = 'zone_account_id'

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => {
        localStorage.setItem(ACCOUNT_KEY, account.id)
        set({ account })
      },
      clearAccount: () => {
        localStorage.removeItem(ACCOUNT_KEY)
        set({ account: null })
      },
    }),
    { name: 'zone-account' }
  )
)
