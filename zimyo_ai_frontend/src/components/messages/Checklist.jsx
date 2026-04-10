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

const STATUS_ICONS = {
  done: { icon: Check, bg: 'bg-green-500', text: 'text-white' },
  active: { icon: Circle, bg: 'bg-blue-500 animate-pulse', text: 'text-white' },
  pending: { icon: Clock, bg: 'bg-gray-300', text: 'text-gray-600' },
  blocked: { icon: AlertOctagon, bg: 'bg-red-500', text: 'text-white' },
}

const SECTION_COLORS = {
  blue: 'border-l-blue-500',
  teal: 'border-l-teal-500',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
  green: 'border-l-green-500',
  red: 'border-l-red-500',
}

const PRIORITY_COLORS = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-gray-500 bg-gray-50',
}

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'text-red-600 hover:bg-red-50',
}

export default function Checklist({ msg, onAction }) {
  const { title, overallProgress, sections = [], alerts = [], actions = [] } = msg

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-lg mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {overallProgress && (
          <span className="text-xs text-gray-500">{overallProgress.completed}/{overallProgress.total}</span>
        )}
      </div>

      {/* Overall progress */}
      {overallProgress && (
        <div className="px-4 pb-3">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-zimyo-600 rounded-full transition-all duration-500" style={{ width: `${overallProgress.percent}%` }} />
          </div>
          {overallProgress.label && <p className="text-[10px] text-gray-400 mt-1">{overallProgress.label}</p>}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map(a => (
            <div key={a.id} className={`px-3 py-2 rounded-lg text-xs border ${
              a.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              a.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>{a.message}</div>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="max-h-[450px] overflow-y-auto">
        {sections.map(section => (
          <SectionBlock key={section.id} section={section} onAction={onAction} />
        ))}
      </div>

      {/* Actions */}
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
    </div>
  )
}

function SectionBlock({ section, onAction }) {
  const [collapsed, setCollapsed] = useState(false)
  const borderColor = SECTION_COLORS[section.color] || 'border-l-gray-400'

  return (
    <div className={`border-t border-gray-100 border-l-4 ${borderColor}`}>
      {/* Section header */}
      <button onClick={() => setCollapsed(!collapsed)} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-800">{section.title}</span>
          {section.progress && (
            <span className="text-[10px] text-gray-400">{section.progress.completed}/{section.progress.total}</span>
          )}
        </div>
        {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="px-4 pb-2 space-y-1">
          {(section.items || []).map(item => (
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
        {/* Status icon */}
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
          <Icon className={`w-3 h-3 ${cfg.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Label + priority */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${item.status === 'done' ? 'text-gray-500 line-through' : item.status === 'blocked' ? 'text-red-700' : 'text-gray-800'}`}>
              {item.label}
            </span>
            {item.priority && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${PRIORITY_COLORS[item.priority] || ''}`}>
                {item.priority}
              </span>
            )}
          </div>

          {/* Meta row: assignee, eta */}
          <div className="flex items-center gap-3 mt-0.5">
            {item.assignee && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {typeof item.assignee === 'string' ? item.assignee : item.assignee.name}
              </span>
            )}
            {item.eta && <span className="text-[10px] text-gray-400">ETA: {item.eta}</span>}
            {item.completedAt && <span className="text-[10px] text-green-600">{item.completedAt}</span>}
          </div>

          {/* Note */}
          {item.note && <p className="text-[10px] text-gray-500 mt-0.5 italic">{item.note}</p>}

          {/* Per-item actions */}
          {item.actions && item.actions.length > 0 && (
            <div className="flex gap-2 mt-1">
              {item.actions.map(a => (
                <button key={a.id} onClick={() => onAction?.({ action: a.id })}
                  className={`text-[10px] font-medium ${ACTION_STYLES[a.style] || 'text-zimyo-600 hover:underline'} px-1.5 py-0.5 rounded`}>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Sub-items */}
          {item.subItems && item.subItems.length > 0 && (
            <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2">
              {item.subItems.map(sub => {
                const sCfg = STATUS_ICONS[sub.status] || STATUS_ICONS.pending
                return (
                  <div key={sub.id} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${sCfg.bg}`}>
                      <sCfg.icon className={`w-2 h-2 ${sCfg.text}`} />
                    </div>
                    <span className={`text-[10px] ${sub.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-600'}`}>{sub.label}</span>
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
