import { useState } from 'react'
import { Bot, X, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Launch-agent dialog. Scope decides which existing onboarding graph the
// supervisor spins up — we don't run a parallel agent stack, we just phrase
// the natural-language command the intent router already understands:
//   • full    → "Onboard <name>"            → full_onboard chain
//   • current → "Run the <step> step for…"  → auto_progress (named bucket)
// The parent fires it through the chat stream and lands the user in the
// assistant where the agent streams reasoning + a single approval card.

const SCOPES = [
  {
    value: 'full',
    label: 'Full workflow',
    help: 'Run all remaining buckets from current state to completion.',
  },
  {
    value: 'current',
    label: 'Current step only',
    help: 'Run just the current step, then pause for the next decision.',
  },
]

export function buildLaunchMessage(scope, candidate) {
  const name = candidate?.name || candidate?.id || 'this candidate'
  const step = candidate?.current_step
  if (scope === 'current' && step) return `Run the ${step} step for ${name}.`
  return `Onboard ${name}.`
}

export default function LaunchAgentModal({ candidate, busy, error, onSpawn, onClose }) {
  const [scope, setScope] = useState('full')
  const selected = SCOPES.find(s => s.value === scope) ?? SCOPES[0]
  const subtitle = [candidate?.workflow_template || 'Default', candidate?.current_step]
    .filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <Bot className="w-5 h-5 text-violet-500 mt-0.5" />
            <div>
              <div className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">Launch agent</div>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                Spawn an autonomous agent for 1 candidate.
              </div>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-5 space-y-5">
          {/* Scope */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2">
              Scope
            </div>
            <div className="relative">
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                disabled={busy}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-[15px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-2">{selected.help}</div>
          </div>

          {/* Candidate */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2">
              Candidate
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
              <div className="text-[14.5px] font-medium text-slate-900 dark:text-slate-100">
                {candidate?.name || candidate?.id}
              </div>
              {subtitle ? (
                <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>
              ) : null}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-4 py-3.5 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
              After launch, the agent will stream its reasoning and pause to ask for any inputs it
              needs. Approve once and it runs to completion in Mission Control.
            </p>
          </div>

          {error ? (
            <div className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12.5px] border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}
            className="text-[14px] h-10 px-4">
            Cancel
          </Button>
          <Button size="sm" disabled={busy}
            onClick={() => onSpawn(scope, buildLaunchMessage(scope, candidate))}
            className={cn(
              'text-[14px] h-10 px-5 gap-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:opacity-90',
            )}>
            <Sparkles className="w-4 h-4" />
            {busy ? 'Spawning…' : 'Spawn 1 agent'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
