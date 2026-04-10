/**
 * Toast — notification system for action feedback.
 *
 * Backend sends toast: { type, message, duration? } in response.
 * Chat.jsx manages toast state and renders this component.
 */

import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const TOAST_CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-green-600', text: 'text-white' },
  error: { icon: AlertCircle, bg: 'bg-red-600', text: 'text-white' },
  info: { icon: Info, bg: 'bg-blue-600', text: 'text-white' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500', text: 'text-white' },
}

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info
  const Icon = config.icon
  const duration = toast.duration || 3000

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, duration, onDismiss])

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-up">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg ${config.bg} ${config.text} max-w-sm`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium flex-1">{toast.message}</span>
        <button onClick={onDismiss} className="shrink-0 hover:opacity-70">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
