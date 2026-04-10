/**
 * Split — renders ui.type === "split"
 *
 * Two-panel layout: summary (left) + rightPanel (right).
 * Use: Review & Confirm, Offer letter, Exit summary.
 */

import { useState } from 'react'
import { Check, Clock, Circle, User } from 'lucide-react'

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white shadow-sm',
  ghost: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

const RP_STATUS = {
  done: { icon: Check, color: 'bg-green-500 text-white' },
  active: { icon: Circle, color: 'bg-blue-500 text-white animate-pulse' },
  pending: { icon: Clock, color: 'bg-gray-300 text-gray-600' },
}

export default function Split({ msg, onAction }) {
  const { title, summary, rightPanel, alerts = [], actions = [] } = msg
  const [confirmDialog, setConfirmDialog] = useState(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map(a => (
            <div key={a.id} className="px-3 py-2 rounded-lg text-xs border bg-blue-50 border-blue-200 text-blue-800">{a.message}</div>
          ))}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex border-t border-gray-100">
        {/* Left: Summary */}
        {summary && (
          <div className="flex-1 p-4 border-r border-gray-100">
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zimyo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {summary.avatarInitials || (summary.name || '?')[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{summary.name}</p>
                {summary.role && <p className="text-[10px] text-gray-500">{summary.role}{summary.department ? ` · ${summary.department}` : ''}</p>}
                {summary.subtitle && <p className="text-[10px] text-gray-400">{summary.subtitle}</p>}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5">
              {(summary.items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right: Panel */}
        {rightPanel && (
          <div className="flex-1 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">{rightPanel.title}</p>

            {/* Checklist type */}
            {rightPanel.type === 'checklist' && rightPanel.items && (
              <div className="space-y-2">
                {rightPanel.items.map((item, i) => {
                  const cfg = RP_STATUS[item.status] || RP_STATUS.pending
                  const Icon = cfg.icon
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${cfg.color}`}>
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                      <span className={`text-xs ${item.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Info type */}
            {rightPanel.type === 'info' && rightPanel.content && (
              <div className="space-y-1.5">
                {rightPanel.content.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-medium text-gray-700">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline type */}
            {rightPanel.type === 'timeline' && rightPanel.timeline && (
              <div className="space-y-2">
                {rightPanel.timeline.map((step, i) => {
                  const cfg = RP_STATUS[step.status] || RP_STATUS.pending
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${step.status === 'done' ? 'bg-green-500' : step.status === 'active' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        {i < rightPanel.timeline.length - 1 && <div className="w-px h-4 bg-gray-200 mt-0.5" />}
                      </div>
                      <div className="flex-1 flex justify-between">
                        <span className={`text-xs ${step.status === 'active' ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>{step.label}</span>
                        {step.time && <span className="text-[10px] text-gray-400">{step.time}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-100 justify-end">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => {
                if (a.confirm) {
                  setConfirmDialog(a)
                } else {
                  onAction?.({ action: a.id })
                }
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={() => setConfirmDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-gray-900">{confirmDialog.confirm.title}</h4>
            <p className="text-xs text-gray-600 mt-1.5">{confirmDialog.confirm.message}</p>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setConfirmDialog(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200">Cancel</button>
              <button onClick={() => { onAction?.({ action: confirmDialog.id }); setConfirmDialog(null) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white ${confirmDialog.confirm.type === 'danger' ? 'bg-red-600' : 'bg-zimyo-600'}`}>
                {confirmDialog.confirm.okText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
