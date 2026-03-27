import { useState, useRef, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { CREATE_ACCOUNT, IMPORT_CSV } from '../lib/graphql/mutations'

interface Props {
  onClose: () => void
  onSuccess: () => void
  accountId?: string  // if provided, skip account creation and import into this account
}

type Step = 'account' | 'import' | 'done'

export default function ImportAccountModal({ onClose, onSuccess, accountId }: Props) {
  const [step, setStep] = useState<Step>(accountId ? 'import' : 'account')

  // Step 1 form state
  const [firmName, setFirmName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('prop')
  const [balance, setBalance] = useState('')

  // Step 1 extras
  const [platform, setPlatform] = useState<string>('auto')

  // Step 2 state
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(accountId ?? null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvRowCount, setCsvRowCount] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [tradesImported, setTradesImported] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formError, setFormError] = useState<string | null>(null)

  const [createAccount, { loading: creatingAccount }] = useMutation(CREATE_ACCOUNT)
  const [importCsv, { loading: importing }] = useMutation(IMPORT_CSV)

  // ── Step 1: submit account ────────────────────────────────────────────────

  const handleAccountContinue = async () => {
    setFormError(null)
    if (!firmName.trim()) return setFormError('Firm name is required.')
    if (!accountName.trim()) return setFormError('Account name is required.')
    if (!balance || isNaN(Number(balance)) || Number(balance) <= 0)
      return setFormError('Enter a valid starting balance.')

    try {
      const { data } = await createAccount({
        variables: {
          firmName: firmName.trim(),
          name: accountName.trim(),
          accountType,
          balance: parseFloat(balance),
        },
      })
      const result = data?.createAccount
      if (result?.errors?.length) {
        setFormError(result.errors.join(' '))
        return
      }
      setCreatedAccountId(result.account.id)
      setStep('import')
    } catch (e: any) {
      setFormError(e.message || 'Something went wrong.')
    }
  }

  // ── Step 2: file reading ──────────────────────────────────────────────────

  const readFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setFormError('Please upload a .csv file.')
      return
    }
    setFormError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text)
      setCsvFileName(file.name)
      // Count data rows (subtract 1 for header)
      const lines = text.trim().split('\n').filter((l) => l.trim().length > 0)
      setCsvRowCount(Math.max(0, lines.length - 1))
    }
    reader.readAsText(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // ── Step 2: submit import ─────────────────────────────────────────────────

  const handleImport = async () => {
    if (!csvText || !createdAccountId) return
    setFormError(null)

    try {
      const { data } = await importCsv({
        variables: {
          accountId: createdAccountId,
          csvData: csvText,
          platform: platform === 'auto' ? null : platform,
        },
      })
      const result = data?.importCsv
      if (result?.errors?.length && result.tradesImported === 0) {
        setFormError(result.errors.join(' '))
        return
      }
      setTradesImported(result.tradesImported)
      setStep('done')
    } catch (e: any) {
      setFormError(e.message || 'Import failed.')
    }
  }

  // ── Done step: close + reload ─────────────────────────────────────────────

  const handleDone = () => {
    onSuccess()
    onClose()
  }

  // ── Input class ───────────────────────────────────────────────────────────

  const inputClass =
    'w-full px-3 py-2 bg-surface-200 border border-border rounded-lg text-white text-sm focus:outline-none focus:border-green/50'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-100 border border-border rounded-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">
              {step === 'account' && 'Set Up Account'}
              {step === 'import' && 'Import Trade History'}
              {step === 'done' && 'Import Complete'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'account' && 'Step 1 of 2 — Account details'}
              {step === 'import' && (accountId ? 'Upload CSV to existing account' : 'Step 2 of 2 — Upload CSV')}
              {step === 'done' && 'Your trades have been imported'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* ── Step 1: Account Setup ── */}
        {step === 'account' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Platform</label>
              <select
                value={platform}
                onChange={(e) => {
                  const val = e.target.value
                  setPlatform(val)
                  if (val === 'tradovate') setFirmName('Tradovate')
                  else if (val === 'topstep') setFirmName('Topstep')
                  else if (val === 'tradingview') setFirmName('TradingView')
                  else setFirmName('Other')
                }}
                className={inputClass}
              >
                <option value="auto">Auto-detect</option>
                <option value="tradovate">Tradovate</option>
                <option value="topstep">Topstep</option>
                <option value="tradingview">TradingView</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. PA123456"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className={inputClass}
              >
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
            {formError && (
              <p className="text-xs text-red-400">{formError}</p>
            )}

            <button
              onClick={handleAccountContinue}
              disabled={creatingAccount}
              className="btn-primary w-full mt-2"
            >
              {creatingAccount ? 'Creating…' : 'Continue'}
            </button>
          </div>
        )}

        {/* ── Step 2: Import CSV ── */}
        {step === 'import' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              {platform === 'tradovate' && 'Export from Tradovate → Performance → Trade History → Export CSV'}
              {platform === 'topstep' && 'Export from Topstep → Trade History → Export'}
              {platform === 'tradingview' && 'Export from TradingView → List of Trades → Export'}
              {platform === 'auto' && 'Upload your CSV — the format will be detected automatically.'}
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${isDragging
                  ? 'border-green/70 bg-green/5'
                  : csvFileName
                  ? 'border-green/40 bg-green/5'
                  : 'border-border hover:border-gray-500'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {csvFileName ? (
                <div className="space-y-1">
                  <div className="text-green text-sm font-medium">{csvFileName}</div>
                  <div className="text-xs text-gray-400">
                    {csvRowCount !== null ? `${csvRowCount} data rows found` : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Click to replace</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl">📂</div>
                  <div className="text-sm text-gray-300">Drop your CSV here</div>
                  <div className="text-xs text-gray-500">or click to browse</div>
                </div>
              )}
            </div>

            {formError && (
              <p className="text-xs text-red-400">{formError}</p>
            )}

            <button
              onClick={handleImport}
              disabled={!csvText || importing}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing…' : 'Import Trades'}
            </button>

            <button
              onClick={() => setStep('account')}
              className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
            >
              Back
            </button>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div className="space-y-5 text-center py-4">
            <div className="text-5xl">✓</div>
            <div>
              <p className="text-white font-semibold text-lg">
                {tradesImported} {tradesImported === 1 ? 'trade' : 'trades'} imported successfully
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your dashboard has been updated with the imported data.
              </p>
            </div>
            <button onClick={handleDone} className="btn-primary w-full">
              View Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
