import { cn } from '@/lib/utils'

const STATE_MAP = {
  running:              { label: 'In progress',         classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900', dot: 'bg-indigo-500' },
  waiting_on_candidate: { label: 'Waiting on candidate', classes: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900',     dot: 'bg-amber-500' },
  awaiting_approval:    { label: 'Needs your attention', classes: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900', dot: 'bg-violet-500' },
  completed:            { label: 'Done',                 classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900', dot: 'bg-emerald-500' },
  cancelled:            { label: 'Withdrawn',            classes: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',       dot: 'bg-slate-400' },
  withdrawn:            { label: 'Withdrawn',            classes: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',       dot: 'bg-slate-400' },
  failed:               { label: 'Failed',               classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900',           dot: 'bg-rose-500' },
}

export default function StatusBadge({ state, className }) {
  const config = STATE_MAP[state]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
        config.classes,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

export const WORKFLOW_STATES = Object.keys(STATE_MAP)
