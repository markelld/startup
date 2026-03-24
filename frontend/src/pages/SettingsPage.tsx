import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { ME } from '../lib/graphql/queries'
import { UPDATE_USER_SETTINGS } from '../lib/graphql/mutations'

export default function SettingsPage() {
  const { data, loading } = useQuery(ME, { fetchPolicy: 'network-only' })
  const [updateSettings, { loading: saving }] = useMutation(UPDATE_USER_SETTINGS)

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [smsEnabled, setSmsEnabled] = useState<boolean | null>(null)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (data?.me && displayName === null) {
      setDisplayName(data.me.displayName || '')
      setPhone(data.me.phone || '')
      setSmsEnabled(data.me.smsEnabled || false)
    }
  }, [data])

  const handleSave = async () => {
    setErrors([])
    setSuccess(false)
    const { data: result } = await updateSettings({
      variables: {
        displayName: displayName?.trim() || null,
        phone: phone?.trim() || null,
        smsEnabled: smsEnabled ?? false,
      },
    }).catch((e) => { setErrors([e.message]); return { data: null } })

    const res = result?.updateUserSettings
    if (!res) return
    if (res.errors?.length) {
      setErrors(res.errors)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 bg-surface-200 border border-border rounded-lg text-white text-sm focus:outline-none focus:border-green/50 placeholder-gray-500'

  const ready = !loading && displayName !== null

  return (
    <div className="p-4 md:p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your profile and notifications</p>
      </div>

      {!ready ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <>
          {/* Profile */}
          <div className="card space-y-4">
            <h2 className="text-sm font-medium text-white">Profile</h2>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={data?.me?.email || ''}
                disabled
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
            </div>
          </div>

          {/* SMS Recap */}
          <div className="card space-y-4">
            <div>
              <h2 className="text-sm font-medium text-white">Daily SMS Recap</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Zone texts you at 6pm ET on trading days to ask how your session went. Your replies are fed to your AI coach for more personal, accurate reports.
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className={inputClass}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">SMS Recap</p>
                <p className="text-xs text-gray-500">Receive daily check-ins via text</p>
              </div>
              <button
                onClick={() => setSmsEnabled(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${smsEnabled ? 'bg-green' : 'bg-surface-200 border border-border'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${smsEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="card border-red/30 bg-red/5 text-red text-sm space-y-1">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {success && (
            <div className="card border-green/30 bg-green/5 text-green text-sm">
              Settings saved.
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      )}
    </div>
  )
}
