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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  pending:   { icon: Clock,         color: 'text-amber-500 dark:text-amber-400',   label: 'Pending' },
  approved:  { icon: CheckCircle2,  color: 'text-emerald-500 dark:text-emerald-400', label: 'Approved' },
  rejected:  { icon: XCircle,       color: 'text-rose-500 dark:text-rose-400',     label: 'Rejected' },
  escalated: { icon: AlertTriangle, color: 'text-orange-500 dark:text-orange-400', label: 'Escalated' },
  expired:   { icon: Clock,         color: 'text-slate-400 dark:text-slate-500',   label: 'Expired' },
}

const PRIORITY_DOT = {
  urgent: 'bg-rose-500',
  high:   'bg-orange-500',
  normal: 'bg-blue-500',
  low:    'bg-slate-400',
}

const STATS_TILE = {
  pending:  'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
  default:  'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
}

export default function Approval({ msg, onAction }) {
  const { title, stats, filter, approvals = [], alerts = [], actions = [] } = msg
  const [activeFilter, setActiveFilter] = useState(filter?.defaultValue || 'All')
  const [confirmDialog, setConfirmDialog] = useState(null)

  const filtered =
    activeFilter === 'All' ? approvals : approvals.filter((a) => a.status === activeFilter.toLowerCase())

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-lg mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>

      {stats && (
        <div className="px-4 pb-2 flex gap-2">
          {Object.entries(stats).map(([key, val]) => (
            <div
              key={key}
              className={cn('flex-1 text-center py-1.5 rounded-lg border text-xs', STATS_TILE[key] || STATS_TILE.default)}
            >
              <p className="text-lg font-bold">{val}</p>
              <p className="text-[10px] capitalize">{key}</p>
            </div>
          ))}
        </div>
      )}

      {filter && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {(filter.options || []).map((opt) => (
            <button
              key={opt}
              onClick={() => setActiveFilter(opt)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10.5px] font-medium transition-all',
                activeFilter === opt
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="px-3 py-2 rounded-lg text-xs border bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200"
            >
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">No items found</div>
        ) : (
          filtered.map((item) => (
            <ApprovalItem key={item.id} item={item} onAction={onAction} onConfirm={setConfirmDialog} />
          ))
        )}
      </div>

      {actions.length > 0 && (
        <div className="px-4 pb-3 pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onAction?.({ action: a.id })}
              className={cn(
                'h-8 text-xs',
                a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              )}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          config={confirmDialog.confirm}
          onOk={() => {
            onAction?.({ action: confirmDialog.actionId })
            setConfirmDialog(null)
          }}
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
    <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-start gap-2.5">
        {item.priority && (
          <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', PRIORITY_DOT[item.priority] || PRIORITY_DOT.normal)} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</span>
            <div className="flex items-center gap-1 shrink-0">
              <StatusIcon className={cn('w-3.5 h-3.5', cfg.color)} />
              <span className={cn('text-[10px] font-medium', cfg.color)}>{cfg.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {item.requestedBy && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {typeof item.requestedBy === 'string' ? item.requestedBy : item.requestedBy.name}
                {item.requestedBy.department && ` · ${item.requestedBy.department}`}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.requestedAt}</span>

          {item.reason && <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">"{item.reason}"</p>}
          {item.note && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 italic">{item.note}</p>}

          {item.details && item.details.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-0.5 hover:underline"
            >
              {expanded ? 'Hide details' : 'View details'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {expanded && item.details && (
            <div className="mt-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 space-y-1">
              {item.details.map((d, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400">{d.label}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {item.actions && item.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {item.actions.map((a) => (
                <Button
                  key={a.id}
                  variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (a.confirm) {
                      onConfirm({ confirm: a.confirm, actionId: a.id })
                    } else {
                      onAction?.({ action: a.id })
                    }
                  }}
                  disabled={a.disabled}
                  title={a.disabled ? a.disabledReason : undefined}
                  className={cn(
                    'h-7 px-2.5 text-[10.5px]',
                    a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
                  )}
                >
                  {a.label}
                </Button>
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-5 max-w-sm mx-4 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{config.title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{config.message}</p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">
            {config.cancelText || 'Cancel'}
          </Button>
          <Button
            variant={config.type === 'danger' ? 'destructive' : 'default'}
            size="sm"
            onClick={onOk}
            className={cn(
              'h-8 text-xs',
              config.type !== 'danger' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
            )}
          >
            {config.okText || 'OK'}
          </Button>
        </div>
      </div>
    </div>
  )
}
