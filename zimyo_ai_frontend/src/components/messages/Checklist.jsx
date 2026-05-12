/**
 * Checklist — renders ui.type === "checklist"
 *
 * Spec fields:
 *   title, overallProgress?, sections[], alerts[], actions[]
 *
 * Section: { id, title, color, progress?, items[] }
 * Item: { id, label, status, assignee?, eta?, completedAt?, priority?, note?, actions?, subItems? }
 */

import { useState } from 'react'
import { Check, Circle, Clock, AlertOctagon, ChevronDown, ChevronRight, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_ICONS = {
  done:    { icon: Check,        bg: 'bg-emerald-500',                       text: 'text-white' },
  active:  { icon: Circle,       bg: 'bg-indigo-500 animate-pulse',          text: 'text-white' },
  pending: { icon: Clock,        bg: 'bg-slate-300 dark:bg-slate-600',       text: 'text-slate-600 dark:text-slate-300' },
  blocked: { icon: AlertOctagon, bg: 'bg-rose-500',                          text: 'text-white' },
}

const SECTION_COLORS = {
  blue:   'border-l-blue-500',
  teal:   'border-l-teal-500',
  amber:  'border-l-amber-500',
  purple: 'border-l-violet-500',
  green:  'border-l-emerald-500',
  red:    'border-l-rose-500',
}

const PRIORITY_COLORS = {
  critical: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/15',
  high:     'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-500/15',
  medium:   'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15',
  low:      'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15',
}

export default function Checklist({ msg, onAction }) {
  const { title, overallProgress, sections = [], alerts = [], actions = [] } = msg

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-lg mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {overallProgress && (
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {overallProgress.completed}/{overallProgress.total}
          </span>
        )}
      </div>

      {overallProgress && (
        <div className="px-4 pb-3">
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress.percent}%` }}
            />
          </div>
          {overallProgress.label && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{overallProgress.label}</p>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                'px-3 py-2 rounded-lg text-xs border',
                a.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'
                  : a.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200'
                    : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200'
              )}
            >
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="max-h-[450px] overflow-y-auto">
        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} onAction={onAction} />
        ))}
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
    </div>
  )
}

function SectionBlock({ section, onAction }) {
  const [collapsed, setCollapsed] = useState(false)
  const borderColor = SECTION_COLORS[section.color] || 'border-l-slate-400'

  return (
    <div className={cn('border-t border-slate-100 dark:border-slate-800 border-l-4', borderColor)}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{section.title}</span>
          {section.progress && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
              {section.progress.completed}/{section.progress.total}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-2 space-y-1">
          {(section.items || []).map((item) => (
            <ChecklistItem key={item.id} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChecklistItem({ item, onAction }) {
  const cfg = STATUS_ICONS[item.status] || STATUS_ICONS.pending
  const Icon = cfg.icon

  return (
    <div className="py-2">
      <div className="flex items-start gap-2.5">
        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
          <Icon className={cn('w-3 h-3', cfg.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-xs',
                item.status === 'done'
                  ? 'text-slate-500 dark:text-slate-400 line-through'
                  : item.status === 'blocked'
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-slate-800 dark:text-slate-100'
              )}
            >
              {item.label}
            </span>
            {item.priority && (
              <span className={cn('px-1.5 py-0.5 rounded text-[9.5px] font-medium', PRIORITY_COLORS[item.priority] || '')}>
                {item.priority}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5">
            {item.assignee && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {typeof item.assignee === 'string' ? item.assignee : item.assignee.name}
              </span>
            )}
            {item.eta && <span className="text-[10px] text-slate-400 dark:text-slate-500">ETA: {item.eta}</span>}
            {item.completedAt && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{item.completedAt}</span>
            )}
          </div>

          {item.note && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">{item.note}</p>}

          {item.actions && item.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {item.actions.map((a) => (
                <Button
                  key={a.id}
                  variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={() => onAction?.({ action: a.id })}
                  className={cn(
                    'h-6 px-2 text-[10.5px]',
                    a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20',
                    !a.style && 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                  )}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}

          {item.subItems && item.subItems.length > 0 && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">
              {item.subItems.map((sub) => {
                const sCfg = STATUS_ICONS[sub.status] || STATUS_ICONS.pending
                const SubIcon = sCfg.icon
                return (
                  <div key={sub.id} className="flex items-center gap-2">
                    <div className={cn('w-3.5 h-3.5 rounded-full flex items-center justify-center', sCfg.bg)}>
                      <SubIcon className={cn('w-2 h-2', sCfg.text)} />
                    </div>
                    <span
                      className={cn(
                        'text-[10px]',
                        sub.status === 'done'
                          ? 'text-slate-400 dark:text-slate-500 line-through'
                          : 'text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {sub.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
