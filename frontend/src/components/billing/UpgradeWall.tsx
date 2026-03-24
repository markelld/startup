import { useMutation } from '@apollo/client'
import { CREATE_CHECKOUT_SESSION } from '../../lib/graphql/mutations'

export default function UpgradeWall() {
  const [createCheckout, { loading }] = useMutation(CREATE_CHECKOUT_SESSION, {
    onCompleted: (data) => {
      if (data.createCheckoutSession?.url) {
        window.location.href = data.createCheckoutSession.url
      }
    },
  })

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center space-y-6">
        <div className="w-12 h-12 bg-green/10 border border-green/20 rounded-xl flex items-center justify-center mx-auto">
          <span className="text-green text-xl">Z</span>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Zone</h1>
          <p className="text-gray-400 text-sm">One plan. Everything included.</p>
        </div>

        <div>
          <p className="text-4xl font-mono font-bold text-white">$12<span className="text-lg text-gray-400">/mo</span></p>
          <p className="text-xs text-green mt-1">7-day free trial</p>
        </div>

        <ul className="text-sm text-gray-300 space-y-2 text-left">
          {[
            'Unlimited broker accounts',
            'AI daily & weekly coaching reports',
            'Screenshot trade journal',
            'Trade grading + behavioral engine',
            'Social share cards',
            'Real-time Tradovate sync',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-green">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={() => createCheckout()}
          disabled={loading}
          className="btn-primary w-full py-3"
        >
          {loading ? 'Loading…' : 'Start Free Trial'}
        </button>

        <p className="text-xs text-gray-500">Cancel anytime. No questions asked.</p>
      </div>
    </div>
  )
}
