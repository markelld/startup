import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { UPDATE_ACCOUNT } from '../lib/graphql/mutations'

interface Account {
  id: string
  name: string
  firmName?: string
  accountType: string
  balance: number
}

interface Props {
  account: Account
  onClose: () => void
  onSaved: (updated: Account) => void
}

const inputClass =
  'w-full px-3 py-2 bg-surface-200 border border-border rounded-lg text-white text-sm focus:outline-none focus:border-green/50'

export default function EditAccountModal({ account, onClose, onSaved }: Props) {
  const [firmName, setFirmName]       = useState(account.firmName || '')
  const [name, setName]               = useState(account.name)
  const [accountType, setAccountType] = useState(account.accountType)
  const [balance, setBalance]         = useState(account.balance.toString())
  const [error, setError]             = useState<string | null>(null)

  const [updateAccount, { loading }] = useMutation(UPDATE_ACCOUNT, {
    onCompleted: (data) => {
      if (data.updateAccount.errors?.length) {
        setError(data.updateAccount.errors[0])
        return
      }
      onSaved(data.updateAccount.account)
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  const handleSave = () => {
    if (!name.trim()) return setError('Account name is required.')
    if (!balance || isNaN(Number(balance)) || Number(balance) <= 0)
      return setError('Enter a valid balance.')
    setError(null)
    updateAccount({
      variables: {
        id: account.id,
        firmName: firmName.trim() || undefined,
        name: name.trim(),
        accountType,
        balance: parseFloat(balance),
      },
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-100 border border-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Edit Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Firm Name</label>
            <input
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="e.g. Tradovate"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PA123456"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Account Type</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={inputClass}>
              <option value="sim">Sim</option>
              <option value="live">Live</option>
              <option value="prop">Prop</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Starting Balance</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="e.g. 150000"
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-red">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
