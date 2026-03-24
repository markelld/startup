import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { MY_TRADING_PLAN } from '../lib/graphql/queries'
import { SAVE_TRADING_PLAN } from '../lib/graphql/mutations'

interface Setup {
  name: string
  description: string
  conditions: string
}

const EMPTY_SETUP: Setup = { name: '', description: '', conditions: '' }

export default function TradingPlanPage() {
  const { data, loading } = useQuery(MY_TRADING_PLAN, { fetchPolicy: 'network-only' })
  const [savePlan, { loading: saving }] = useMutation(SAVE_TRADING_PLAN)

  const [playbook, setPlaybook] = useState<Setup[]>([])
  const [rules, setRules] = useState<string[]>([])
  const [weeklyIntention, setWeeklyIntention] = useState('')
  const [editingSetup, setEditingSetup] = useState<number | null>(null)
  const [draftSetup, setDraftSetup] = useState<Setup>(EMPTY_SETUP)
  const [newRule, setNewRule] = useState('')
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (data && !initialized) {
      const plan = data.myTradingPlan
      if (plan) {
        setPlaybook(plan.playbook || [])
        setRules(plan.rules || [])
        setWeeklyIntention(plan.weeklyIntention || '')
      }
      setInitialized(true)
    }
  }, [data, initialized])

  const handleSave = async () => {
    setErrors([])
    setSuccess(false)
    const { data: result } = await savePlan({
      variables: { playbook, rules, weeklyIntention: weeklyIntention.trim() || null },
    }).catch((e) => { setErrors([e.message]); return { data: null } })

    const res = result?.saveTradingPlan
    if (!res) return
    if (res.errors?.length) {
      setErrors(res.errors)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  // ── Playbook handlers ────────────────────────────────────────────────────

  const openNewSetup = () => {
    setDraftSetup(EMPTY_SETUP)
    setEditingSetup(playbook.length) // index = end (new)
  }

  const openEditSetup = (i: number) => {
    setDraftSetup({ ...playbook[i] })
    setEditingSetup(i)
  }

  const saveSetup = () => {
    if (!draftSetup.name.trim()) return
    const next = [...playbook]
    if (editingSetup === playbook.length) {
      next.push(draftSetup)
    } else {
      next[editingSetup!] = draftSetup
    }
    setPlaybook(next)
    setEditingSetup(null)
  }

  const removeSetup = (i: number) => setPlaybook(playbook.filter((_, idx) => idx !== i))

  // ── Rules handlers ───────────────────────────────────────────────────────

  const addRule = () => {
    if (!newRule.trim()) return
    setRules([...rules, newRule.trim()])
    setNewRule('')
  }

  const removeRule = (i: number) => setRules(rules.filter((_, idx) => idx !== i))

  const inputClass = 'w-full px-3 py-2 bg-surface-200 border border-border rounded-lg text-white text-sm focus:outline-none focus:border-green/50 placeholder-gray-500'

  if (loading || !initialized) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Trading Plan</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your rules and setups — used by AI to coach you</p>
      </div>

      {/* ── Playbook ── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Playbook</h2>
          <button onClick={openNewSetup} className="text-xs text-green hover:underline">+ Add Setup</button>
        </div>

        {playbook.length === 0 && editingSetup === null && (
          <p className="text-xs text-gray-500">No setups yet. Add the patterns you trade.</p>
        )}

        <div className="space-y-2">
          {playbook.map((setup, i) => (
            editingSetup === i ? (
              <SetupForm
                key={i}
                draft={draftSetup}
                onChange={setDraftSetup}
                onSave={saveSetup}
                onCancel={() => setEditingSetup(null)}
              />
            ) : (
              <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface-200 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{setup.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{setup.description}</p>
                  {setup.conditions && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">{setup.conditions}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEditSetup(i)} className="text-xs text-gray-400 hover:text-white transition-colors">✎</button>
                  <button onClick={() => removeSetup(i)} className="text-xs text-gray-500 hover:text-red transition-colors">×</button>
                </div>
              </div>
            )
          ))}

          {editingSetup === playbook.length && (
            <SetupForm
              draft={draftSetup}
              onChange={setDraftSetup}
              onSave={saveSetup}
              onCancel={() => setEditingSetup(null)}
            />
          )}
        </div>
      </div>

      {/* ── Rules ── */}
      <div className="card space-y-4">
        <h2 className="text-sm font-medium text-white">Rules</h2>

        {rules.length === 0 && (
          <p className="text-xs text-gray-500">No rules yet. Add the commitments you trade by.</p>
        )}

        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-green text-xs shrink-0">☑</span>
              <span className="text-sm text-gray-200 flex-1">{rule}</span>
              <button onClick={() => removeRule(i)} className="text-xs text-gray-500 hover:text-red transition-colors shrink-0">×</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRule()}
            placeholder="e.g. No trades in the first 5 minutes"
            className={inputClass}
          />
          <button
            onClick={addRule}
            disabled={!newRule.trim()}
            className="btn-primary px-4 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Weekly Intention ── */}
      <div className="card space-y-3">
        <div>
          <h2 className="text-sm font-medium text-white">Weekly Intention</h2>
          <p className="text-xs text-gray-500 mt-0.5">One sentence goal for this week — included in your weekly AI report.</p>
        </div>
        <textarea
          value={weeklyIntention}
          onChange={(e) => setWeeklyIntention(e.target.value)}
          placeholder="e.g. Focus on execution quality, only take A+ setups"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      {errors.length > 0 && (
        <div className="card border-red/30 bg-red/5 text-red text-sm space-y-1">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {success && (
        <div className="card border-green/30 bg-green/5 text-green text-sm">
          Trading plan saved. The AI will use this in future reports.
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-60">
        {saving ? 'Saving…' : 'Save Plan'}
      </button>
    </div>
  )
}

function SetupForm({ draft, onChange, onSave, onCancel }: {
  draft: Setup
  onChange: (s: Setup) => void
  onSave: () => void
  onCancel: () => void
}) {
  const cls = 'w-full px-3 py-2 bg-surface-100 border border-green/30 rounded-lg text-white text-sm focus:outline-none focus:border-green/60 placeholder-gray-500'
  return (
    <div className="p-3 bg-surface-200 rounded-xl border border-green/20 space-y-2">
      <input
        autoFocus
        type="text"
        placeholder="Setup name (e.g. Opening Range Breakout)"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        className={cls}
      />
      <textarea
        placeholder="Description"
        value={draft.description}
        onChange={(e) => onChange({ ...draft, description: e.target.value })}
        rows={3}
        className={`${cls} resize-none`}
      />
      <input
        type="text"
        placeholder="Ideal conditions (optional)"
        value={draft.conditions}
        onChange={(e) => onChange({ ...draft, conditions: e.target.value })}
        className={cls}
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={!draft.name.trim()} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
          Save Setup
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
