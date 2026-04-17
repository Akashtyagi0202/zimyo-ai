/**
 * Card — renders ui.type === "card"
 *
 * Spec fields:
 *   title, badge?, header?, tabs?, cardData?, bodyText?,
 *   expandableSections?, alerts[], actions[]
 *
 * cardData types: text, badge, progress, link, copy
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink } from 'lucide-react'

const BADGE_COLORS = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  teal: 'bg-teal-100 text-teal-700',
  default: 'bg-gray-100 text-gray-700',
}

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white shadow-sm',
  ghost: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

export default function Card({ msg, onAction }) {
  const { title, badge, header, tabs, cardData, bodyText, expandableSections = [], alerts = [], actions = [] } = msg
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id || null)

  const currentTab = tabs?.find(t => t.id === activeTab)
  const displayData = currentTab?.cardData || cardData || []
  const attachments = currentTab?.attachments || []

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-md mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${BADGE_COLORS[badge.color] || BADGE_COLORS.default}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Profile header */}
      {header && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {header.avatarInitials || (header.name || '?')[0]}
          </div>
          <div className="flex-1 min-w-0">
            {header.name && <p className="text-sm font-medium text-gray-900 truncate">{header.name}</p>}
            {header.subtitle && <p className="text-xs text-gray-500 truncate">{header.subtitle}</p>}
            {header.tags && header.tags.length > 0 && (
              <div className="flex gap-1.5 mt-1">
                {header.tags.map((t, i) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${BADGE_COLORS[t.color] || BADGE_COLORS.default}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map(a => (
            <div key={a.id} className={`px-3 py-2 rounded-lg text-xs border ${
              a.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              a.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              a.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {tabs && tabs.length > 1 && (
        <div className="px-4 flex gap-1 border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-zimyo-600 text-zimyo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Card Data (key-value pairs) */}
      {displayData.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {displayData.map((item, i) => (
            <CardDataItem key={i} item={item} onAction={onAction} />
          ))}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                {att.type || 'file'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{att.name}</p>
                <p className="text-[10px] text-gray-400">{att.size}{att.uploadedAt ? ` · ${att.uploadedAt}` : ''}</p>
              </div>
              <button
                onClick={() => onAction?.({ action: 'download', url: att.downloadUrl, name: att.name })}
                className="text-xs text-zimyo-600 hover:underline shrink-0"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Body text */}
      {bodyText && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{bodyText}</p>
        </div>
      )}

      {/* Expandable sections */}
      {expandableSections.map(section => (
        <ExpandableSection key={section.id} section={section} />
      ))}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-100">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => onAction?.({ action: a.id })}
              disabled={a.disabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


function CardDataItem({ item, onAction }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.value || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{item.label}</span>
      <div className="flex items-center gap-1.5">
        {/* Badge type */}
        {item.type === 'badge' && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_COLORS[item.color] || BADGE_COLORS.default}`}>
            {item.value}
          </span>
        )}

        {/* Progress type */}
        {item.type === 'progress' && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color === 'green' ? 'bg-green-500' : item.color === 'amber' ? 'bg-amber-500' : 'bg-zimyo-500'}`}
                style={{ width: `${item.percent || 0}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700">{item.value}</span>
          </div>
        )}

        {/* Link type */}
        {item.type === 'link' && (
          <button
            onClick={() => onAction?.({ action: item.actionId })}
            className="text-xs text-zimyo-600 hover:underline flex items-center gap-1"
          >
            {item.value} <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* Copy type */}
        {item.type === 'copy' && (
          <button onClick={handleCopy} className="text-xs text-gray-700 flex items-center gap-1 hover:text-zimyo-600">
            {item.value}
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
          </button>
        )}

        {/* Default text */}
        {(!item.type || item.type === 'text') && (
          <span className="text-xs font-medium text-gray-800">{item.value}</span>
        )}
      </div>
    </div>
  )
}


function ExpandableSection({ section }) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? false)

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-medium text-zimyo-600">{section.title}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>
        </div>
      )}
    </div>
  )
}
