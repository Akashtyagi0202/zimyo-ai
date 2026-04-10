/**
 * Confirmation — renders ui.type === "confirmation"
 *
 * Spec fields:
 *   title, confirmationStatus, confirmationMessage,
 *   metadata[], timeline[], actions[], alerts[]
 */

import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    msgColor: 'text-green-700',
    dot: 'bg-green-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    msgColor: 'text-red-700',
    dot: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    msgColor: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    msgColor: 'text-blue-700',
    dot: 'bg-blue-500',
  },
}

const TIMELINE_DOT = {
  done: 'bg-green-500',
  active: 'bg-blue-500 animate-pulse',
  pending: 'bg-gray-300',
}

export default function Confirmation({ msg, onAction }) {
  const { title, confirmationStatus = 'success', confirmationMessage, metadata, timeline, actions } = msg
  const config = STATUS_CONFIG[confirmationStatus] || STATUS_CONFIG.success
  const Icon = config.icon

  return (
    <div className={`border rounded-xl overflow-hidden w-full max-w-md mt-2 animate-fade-in-scale ${config.bg}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div>
          <p className={`text-sm font-semibold ${config.titleColor}`}>{title}</p>
          {confirmationMessage && (
            <p className={`text-xs mt-1 ${config.msgColor}`}>{confirmationMessage}</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      {metadata && metadata.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 rounded-lg px-3 py-2 space-y-1.5">
            {metadata.map((m, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-500">{m.label}</span>
                <span className="font-medium text-gray-800">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline && timeline.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 rounded-lg px-3 py-2">
            {timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${TIMELINE_DOT[step.status] || TIMELINE_DOT.pending}`} />
                  {i < timeline.length - 1 && <div className="w-px h-4 bg-gray-200 mt-0.5" />}
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <span className={`text-xs ${step.status === 'done' ? 'text-gray-700' : step.status === 'active' ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                  {step.time && (
                    <span className="text-[10px] text-gray-400 ml-2">{step.time}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="px-4 pb-4 flex gap-2">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => onAction?.({ action: a.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                a.style === 'primary'
                  ? 'bg-white text-gray-800 shadow-sm hover:shadow border border-gray-200'
                  : a.style === 'danger'
                    ? 'text-red-600 hover:bg-red-100/50'
                    : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
