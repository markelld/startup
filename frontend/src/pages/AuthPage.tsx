import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { SIGN_IN, SIGN_UP, GOOGLE_SIGN_IN, UPDATE_USER_SETTINGS } from '../lib/graphql/mutations'
import { useAuthStore } from '../stores/authStore'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({ placeholder, value, onChange, required }: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-200 border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const [signIn, { loading: signInLoading }] = useMutation(SIGN_IN, {
    onCompleted: (data) => {
      const result = data.signIn
      if (result.errors?.length > 0) { setErrors(result.errors); return }
      setAuth(result.token, result.user)
      navigate('/dashboard')
    },
    onError: (err) => setErrors([err.message]),
  })

  const [updateUserSettings] = useMutation(UPDATE_USER_SETTINGS)

  const [signUp, { loading: signUpLoading }] = useMutation(SIGN_UP, {
    onCompleted: async (data) => {
      const result = data.signUp
      if (result.errors?.length > 0) { setErrors(result.errors); return }
      setAuth(result.token, result.user)
      if (phone.trim()) {
        await updateUserSettings({ variables: { phone: phone.trim(), smsEnabled: true } }).catch(() => {})
      }
      navigate('/dashboard')
    },
    onError: (err) => setErrors([err.message]),
  })

  const [googleSignInMutation, { loading: googleLoading }] = useMutation(GOOGLE_SIGN_IN, {
    onCompleted: (data) => {
      const result = data.googleSignIn
      if (result.errors?.length > 0) { setErrors(result.errors); return }
      setAuth(result.token, result.user)
      navigate('/dashboard')
    },
    onError: (err) => setErrors([err.message]),
  })

  const handleGoogleSuccess = (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) { setErrors(['Google sign-in failed']); return }
    googleSignInMutation({ variables: { idToken: credentialResponse.credential } })
  }

  const loading = signInLoading || signUpLoading || googleLoading

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    if (mode === 'signup' && password !== confirmPassword) {
      setErrors(['Passwords do not match'])
      return
    }
    if (mode === 'signin') {
      signIn({ variables: { email, password } })
    } else {
      signUp({ variables: { email, password, displayName } })
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setErrors([])
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="card max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="font-bold text-surface-900">Z</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Zone</h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface-200 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-200 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green"
          />
          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={setPassword}
            required
          />
          {mode === 'signup' && (
            <PasswordInput
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />
          )}
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-surface-200 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green"
              />
              <p className="text-xs text-gray-500 leading-relaxed px-0.5">
                Zone sends you a daily SMS recap at 6pm ET — a quick check-in that gets fed to your AI coach for better, more personal reports. You can turn this off anytime in Settings.
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="text-red text-sm space-y-1">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-gray-500">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrors(['Google sign-in failed'])}
            theme="filled_black"
            shape="rectangular"
            width="100%"
          />
        </div>

        <p className="text-center text-sm text-gray-400">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchMode} className="text-green hover:underline">
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
