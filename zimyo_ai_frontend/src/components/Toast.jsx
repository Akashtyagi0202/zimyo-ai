/**
 * Toast — notification system for action feedback.
 *
 * Backend sends toast: { type, message, duration? } in response.
 * Chat.jsx manages toast state and renders this component.
 */

import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    surface: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    accent: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    icon: AlertCircle,
    surface: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    accent: 'text-rose-700 dark:text-rose-300',
  },
  info: {
    icon: Info,
    surface: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    accent: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    surface: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    accent: 'text-amber-700 dark:text-amber-300',
  },
}

export default function Toast({ toast, onDismiss }) {
  const duration = toast?.duration || 3000

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, duration, onDismiss])

  if (!toast) return null

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info
  const Icon = config.icon

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-up">
      <div
        className={cn(
          'flex items-center gap-2.5 pl-3 pr-1 py-2 rounded-xl border shadow-lg max-w-sm',
          config.surface
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', config.accent)} />
        <span className={cn('text-[13px] font-medium flex-1', config.accent)}>{toast.message}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className={cn('h-6 w-6 shrink-0 hover:bg-black/5 dark:hover:bg-white/5', config.accent)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
