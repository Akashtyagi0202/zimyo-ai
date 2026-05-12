/**
 * Dashboard — renders ui.type === "dashboard"
 *
 * Spec fields:
 *   title, greeting?, stats[], widgets[], alerts[], actions[]
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STAT_COLORS = {
  blue:    'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200',
  green:   'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200',
  amber:   'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200',
  red:     'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200',
  purple:  'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-800 dark:text-violet-200',
  teal:    'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-200',
  default: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100',
}

const TREND_ICON = { up: '↑', down: '↓', stable: '→' }

export default function Dashboard({ msg, onAction }) {
  const { title, greeting, stats = [], widgets = [], actions = [] } = msg

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2">
        {greeting && <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{greeting}</p>}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>

      {stats.length > 0 && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <button
              key={stat.id}
              onClick={() => stat.clickAction && onAction?.({ action: stat.clickAction })}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                stat.clickAction && 'cursor-pointer hover:shadow-sm',
                STAT_COLORS[stat.color] || STAT_COLORS.default
              )}
            >
              <p className="text-[10px] opacity-70">{stat.label}</p>
              <p className="text-lg font-bold mt-0.5 tabular-nums">{stat.value}</p>
              {stat.trend && (
                <p
                  className={cn(
                    'text-[10px] mt-0.5',
                    stat.trend === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : stat.trend === 'down'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {TREND_ICON[stat.trend]} {stat.trendValue}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {widgets.map((widget) => (
        <div key={widget.id} className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{widget.title}</span>
            {widget.viewAllAction && (
              <Button
                variant="link"
                size="sm"
                onClick={() => onAction?.({ action: widget.viewAllAction })}
                className="h-auto p-0 text-[10px] text-indigo-600 dark:text-indigo-400"
              >
                View all
              </Button>
            )}
          </div>

          {widget.type === 'mini_table' && widget.data?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {(widget.columns || []).map((col) => (
                      <th
                        key={col}
                        className="py-1.5 text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {widget.data.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60 last:border-b-0">
                      {(widget.columns || []).map((col) => (
                        <td key={col} className="py-1.5 text-slate-700 dark:text-slate-200">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {widget.type === 'mini_list' &&
            (widget.data || []).map((item, i) => (
              <button
                key={i}
                onClick={() => item.clickAction && onAction?.({ action: item.clickAction })}
                className="w-full flex items-start gap-2.5 py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                  {item.subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>}
                </div>
                {item.date && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{item.date}</span>
                )}
              </button>
            ))}

          {widget.type === 'avatar_list' &&
            (widget.data || []).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0"
              >
                <Avatar className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0">
                  <AvatarFallback className="rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {item.avatar || (item.name || '?')[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                  {item.subtitle && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                  )}
                </div>
                {item.status && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{item.status}</span>
                )}
              </div>
            ))}

          {(!widget.data || widget.data.length === 0) && widget.emptyText && (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-2">{widget.emptyText}</p>
          )}
        </div>
      ))}

      {actions.length > 0 && (
        <div className="px-4 pb-3 pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : 'outline'}
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
