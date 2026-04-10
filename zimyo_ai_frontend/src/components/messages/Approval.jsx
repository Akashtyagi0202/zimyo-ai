/**
 * Approval — renders ui.type === "approval"
 *
 * Spec fields:
 *   title, stats?, filter?, approvals[], alerts[], actions[]
 *
 * Approval item: { id, title, type?, requestedBy, status, requestedAt, priority?, details?, actions[] }
 */

import { useState } from 'react'
import { Clock, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, User } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Rejected' },
  escalated: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', label: 'Escalated' },
  expired: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: 'Expired' },
}

const PRIORITY_DOT = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
}

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white',
  ghost: 'text-gray-600 hover:bg-gray-100 border border-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

export default function Approval({ msg, onAction }) {
  const { title, stats, filter, approvals = [], alerts = [], actions = [] } = msg
  const [activeFilter, setActiveFilter] = useState(filter?.defaultValue || 'All')
  const [confirmDialog, setConfirmDialog] = useState(null)

  const filtered = activeFilter === 'All'
    ? approvals
    : approvals.filter(a => a.status === activeFilter.toLowerCase())

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-lg mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 pb-2 flex gap-2">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className={`flex-1 text-center py-1.5 rounded-lg border text-xs ${
              key === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              key === 'approved' ? 'bg-green-50 border-green-200 text-green-700' :
              key === 'rejected' ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              <p className="text-lg font-bold">{val}</p>
              <p className="text-[10px] capitalize">{key}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {filter && (
        <div className="px-4 pb-2 flex gap-1">
          {(filter.options || []).map(opt => (
            <button
              key={opt}
              onClick={() => setActiveFilter(opt)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                activeFilter === opt ? 'bg-zimyo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map(a => (
            <div key={a.id} className="px-3 py-2 rounded-lg text-xs border bg-blue-50 border-blue-200 text-blue-800">{a.message}</div>
          ))}
        </div>
      )}

      {/* Approval cards */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">No items found</div>
        ) : (
          filtered.map(item => (
            <ApprovalItem key={item.id} item={item} onAction={onAction} onConfirm={setConfirmDialog} />
          ))
        )}
      </div>

      {/* Footer actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-3 pt-2 flex gap-2 border-t border-gray-100">
          {actions.map(a => (
            <button key={a.id} onClick={() => onAction?.({ action: a.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          config={confirmDialog.confirm}
          onOk={() => { onAction?.({ action: confirmDialog.actionId }); setConfirmDialog(null) }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

function ApprovalItem({ item, onAction, onConfirm }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon

  return (
    <div className="border-t border-gray-100 px-4 py-3 hover:bg-gray-50/50 transition-colors">
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        {/* Priority dot */}
        {item.priority && (
          <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${PRIORITY_DOT[item.priority] || PRIORITY_DOT.normal}`} />
        )}

        <div className="flex-1 min-w-0">
          {/* Title + status */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-900 truncate">{item.title}</span>
            <div className="flex items-center gap-1 shrink-0">
              <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
              <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
          </div>

          {/* Requested by + time */}
          <div className="flex items-center gap-2 mt-1">
            {item.requestedBy && (
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {typeof item.requestedBy === 'string' ? item.requestedBy : item.requestedBy.name}
                {item.requestedBy.department && ` · ${item.requestedBy.department}`}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">{item.requestedAt}</span>

          {/* Reason */}
          {item.reason && <p className="text-[10px] text-gray-600 mt-1">"{item.reason}"</p>}

          {/* Note */}
          {item.note && <p className="text-[10px] text-gray-400 mt-0.5 italic">{item.note}</p>}

          {/* Expandable details */}
          {item.details && item.details.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-zimyo-600 mt-1 flex items-center gap-0.5 hover:underline">
              {expanded ? 'Hide details' : 'View details'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {expanded && item.details && (
            <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
              {item.details.map((d, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-gray-500">{d.label}</span>
                  <span className="font-medium text-gray-700">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Item actions */}
          {item.actions && item.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {item.actions.map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    if (a.confirm) {
                      onConfirm({ confirm: a.confirm, actionId: a.id })
                    } else {
                      onAction?.({ action: a.id })
                    }
                  }}
                  disabled={a.disabled}
                  title={a.disabled ? a.disabledReason : undefined}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ config, onOk, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <h4 className="text-sm font-semibold text-gray-900">{config.title}</h4>
        <p className="text-xs text-gray-600 mt-1.5">{config.message}</p>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200">
            {config.cancelText || 'Cancel'}
          </button>
          <button onClick={onOk} className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white ${
            config.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-zimyo-600 hover:bg-zimyo-700'
          }`}>
            {config.okText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
