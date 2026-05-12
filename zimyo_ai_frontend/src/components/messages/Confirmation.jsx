/**
 * Confirmation — renders ui.type === "confirmation"
 *
 * Spec fields:
 *   title, confirmationStatus, confirmationMessage,
 *   metadata[], timeline[], actions[], alerts[]
 */

import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    titleColor: 'text-emerald-800 dark:text-emerald-200',
    msgColor: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    iconColor: 'text-rose-500 dark:text-rose-400',
    titleColor: 'text-rose-800 dark:text-rose-200',
    msgColor: 'text-rose-700 dark:text-rose-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    iconColor: 'text-amber-500 dark:text-amber-400',
    titleColor: 'text-amber-800 dark:text-amber-200',
    msgColor: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-200',
    msgColor: 'text-blue-700 dark:text-blue-300',
  },
}

const TIMELINE_DOT = {
  done: 'bg-emerald-500',
  active: 'bg-indigo-500 animate-pulse',
  pending: 'bg-slate-300 dark:bg-slate-600',
}

export default function Confirmation({ msg, onAction }) {
  const { title, confirmationStatus = 'success', confirmationMessage, metadata, timeline, actions } = msg
  const config = STATUS_CONFIG[confirmationStatus] || STATUS_CONFIG.success
  const Icon = config.icon

  return (
    <div className={cn('border rounded-xl overflow-hidden w-full max-w-md mt-2 animate-fade-in-scale', config.bg)}>
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <Icon className={cn('w-6 h-6 shrink-0 mt-0.5', config.iconColor)} />
        <div>
          <p className={cn('text-sm font-semibold', config.titleColor)}>{title}</p>
          {confirmationMessage && (
            <p className={cn('text-xs mt-1', config.msgColor)}>{confirmationMessage}</p>
          )}
        </div>
      </div>

      {metadata && metadata.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white/70 dark:bg-slate-900/40 rounded-lg px-3 py-2 space-y-1.5">
            {metadata.map((m, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{m.label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {timeline && timeline.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white/70 dark:bg-slate-900/40 rounded-lg px-3 py-2">
            {timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <div className="flex flex-col items-center mt-1">
                  <div
                    className={cn('w-2 h-2 rounded-full shrink-0', TIMELINE_DOT[step.status] || TIMELINE_DOT.pending)}
                  />
                  {i < timeline.length - 1 && <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mt-0.5" />}
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <span
                    className={cn(
                      'text-xs',
                      step.status === 'done'
                        ? 'text-slate-700 dark:text-slate-200'
                        : step.status === 'active'
                          ? 'text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.time && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">{step.time}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="px-4 pb-4 flex gap-2">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => onAction?.({ action: a.id })}
              className={cn(
                'h-8 text-xs',
                a.style === 'primary' &&
                  'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm hover:shadow border-slate-200 dark:border-slate-700',
                a.style === 'danger' &&
                  'text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-500/10',
                !a.style && 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-900/40'
              )}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
