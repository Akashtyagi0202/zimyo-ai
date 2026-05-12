/**
 * QuickActions — empty-state landing for a fresh chat.
 *
 * Craze-style minimal layout:
 *   - centered tagline (subdued, no badge / no gradient title)
 *   - "Suggested" prompt pills anchored just above the input area
 *
 * Per agent type (leave / policy / onboarding) the prompt list differs but
 * the rendering shape is identical.
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ONBOARDING_PROMPTS = [
  'Compute CTC for Akash',
  'How many candidates are pending in Add Candidate CTC?',
  'Send offer letter to the candidate',
]

const LEAVE_PROMPTS = [
  'Sick leave for tomorrow',
  'WFH today 10am to 7pm',
  'Show my leave balance',
]

const POLICY_PROMPTS = [
  'What is the leave policy?',
  'Explain the WFH rules',
  'How many sick leaves are allowed?',
]

export default function QuickActions({ agentType, onAction }) {
  const isPolicy = agentType === 'policy'
  const isOnboarding = agentType === 'onboarding'
  const prompts = isOnboarding
    ? ONBOARDING_PROMPTS
    : isPolicy
      ? POLICY_PROMPTS
      : LEAVE_PROMPTS

  const caption = isOnboarding
    ? 'Compute CTC, send offer letters, and progress candidates across the onboarding workflow.'
    : isPolicy
      ? 'Ask about leave, attendance, WFH, or any HR policy — answers cite the source document.'
      : 'Apply leaves, mark on-duty, check balances, and see upcoming holidays.'

  return (
    <div className="h-full flex flex-col">
      {/* Centered tagline — fills the empty area above the suggestions */}
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-center text-[13px] text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
          {caption}
        </p>
      </div>

      {/* Suggested pills — anchored just above the input */}
      <div className="px-4 pb-2">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 px-1 uppercase tracking-wider">
            Suggested
          </p>
          <div className="flex flex-col gap-1.5">
            {prompts.map((prompt, i) => (
              <Button
                key={prompt}
                variant="outline"
                onClick={() => onAction(prompt)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={cn(
                  'animate-stagger w-full h-auto justify-start text-left px-3.5 py-2.5 rounded-xl',
                  'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60',
                  'text-[13px] font-normal text-slate-700 dark:text-slate-200',
                  'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
                  'whitespace-normal'
                )}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
