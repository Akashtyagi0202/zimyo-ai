/**
 * Split — renders ui.type === "split"
 *
 * Two-panel layout: summary (left) + rightPanel (right).
 * Use: Review & Confirm, Offer letter, Exit summary.
 */

import { useState } from 'react'
import { Check, Clock, Circle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RP_STATUS = {
  done:    { icon: Check,  color: 'bg-emerald-500 text-white' },
  active:  { icon: Circle, color: 'bg-indigo-500 text-white animate-pulse' },
  pending: { icon: Clock,  color: 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300' },
}

export default function Split({ msg, onAction }) {
  const { title, summary, rightPanel, alerts = [], actions = [] } = msg
  const [confirmDialog, setConfirmDialog] = useState(null)

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>

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

      <div className="flex border-t border-slate-100 dark:border-slate-800">
        {summary && (
          <div className="flex-1 p-4 border-r border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 rounded-xl bg-indigo-600 shrink-0">
                <AvatarFallback className="rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                  {summary.avatarInitials || (summary.name || '?')[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{summary.name}</p>
                {summary.role && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {summary.role}
                    {summary.department ? ` · ${summary.department}` : ''}
                  </p>
                )}
                {summary.subtitle && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{summary.subtitle}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {(summary.items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-xs gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rightPanel && (
          <div className="flex-1 p-4">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-3">{rightPanel.title}</p>

            {rightPanel.type === 'checklist' && rightPanel.items && (
              <div className="space-y-2">
                {rightPanel.items.map((item, i) => {
                  const cfg = RP_STATUS[item.status] || RP_STATUS.pending
                  const Icon = cfg.icon
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={cn('w-4 h-4 rounded-full flex items-center justify-center', cfg.color)}>
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                      <span
                        className={cn(
                          'text-xs',
                          item.status === 'done'
                            ? 'text-slate-500 dark:text-slate-400 line-through'
                            : 'text-slate-700 dark:text-slate-200'
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {rightPanel.type === 'info' && rightPanel.content && (
              <div className="space-y-1.5">
                {rightPanel.content.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs gap-3">
                    <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {rightPanel.type === 'timeline' && rightPanel.timeline && (
              <div className="space-y-2">
                {rightPanel.timeline.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          step.status === 'done'
                            ? 'bg-emerald-500'
                            : step.status === 'active'
                              ? 'bg-indigo-500'
                              : 'bg-slate-300 dark:bg-slate-600'
                        )}
                      />
                      {i < rightPanel.timeline.length - 1 && (
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1 flex justify-between gap-2">
                      <span
                        className={cn(
                          'text-xs',
                          step.status === 'active'
                            ? 'text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'text-slate-600 dark:text-slate-300'
                        )}
                      >
                        {step.label}
                      </span>
                      {step.time && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{step.time}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800 justify-end">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => {
                if (a.confirm) {
                  setConfirmDialog(a)
                } else {
                  onAction?.({ action: a.id })
                }
              }}
              className={cn(
                'h-9 text-xs',
                a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              )}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {confirmDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-5 max-w-sm mx-4 animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{confirmDialog.confirm.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{confirmDialog.confirm.message}</p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                variant={confirmDialog.confirm.type === 'danger' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => {
                  onAction?.({ action: confirmDialog.id })
                  setConfirmDialog(null)
                }}
                className={cn(
                  'h-8 text-xs',
                  confirmDialog.confirm.type !== 'danger' &&
                    'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
                )}
              >
                {confirmDialog.confirm.okText || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
