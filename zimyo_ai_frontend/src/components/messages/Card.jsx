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
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const BADGE_COLORS = {
  green:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  red:     'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  purple:  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  teal:    'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
}

const PROGRESS_COLORS = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red:   'bg-rose-500',
  blue:  'bg-blue-500',
  default: 'bg-indigo-500',
}

export default function Card({ msg, onAction }) {
  const { title, badge, header, tabs, cardData, bodyText, expandableSections = [], alerts = [], actions = [] } = msg
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id || null)

  const currentTab = tabs?.find((t) => t.id === activeTab)
  const displayData = currentTab?.cardData || cardData || []
  const attachments = currentTab?.attachments || []

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-md mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {badge && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                BADGE_COLORS[badge.color] || BADGE_COLORS.default
              )}
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {header && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl bg-indigo-600 shrink-0">
            <AvatarFallback className="rounded-xl bg-indigo-600 text-white text-sm font-semibold">
              {header.avatarInitials || (header.name || '?')[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {header.name && <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{header.name}</p>}
            {header.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{header.subtitle}</p>}
            {header.tags && header.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {header.tags.map((t, i) => (
                  <span
                    key={i}
                    className={cn('px-1.5 py-0.5 rounded text-[9.5px] font-medium', BADGE_COLORS[t.color] || BADGE_COLORS.default)}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </div>
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
                    : a.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200'
              )}
            >
              {a.message}
            </div>
          ))}
        </div>
      )}

      {tabs && tabs.length > 1 && (
        <div className="px-4 flex gap-1 border-b border-slate-100 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {displayData.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {displayData.map((item, i) => (
            <CardDataItem key={i} item={item} onAction={onAction} />
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700"
            >
              <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {att.type || 'file'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{att.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {att.size}
                  {att.uploadedAt ? ` · ${att.uploadedAt}` : ''}
                </p>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => onAction?.({ action: 'download', url: att.downloadUrl, name: att.name })}
                className="h-7 px-1 text-xs text-indigo-600 dark:text-indigo-400"
              >
                Download
              </Button>
            </div>
          ))}
        </div>
      )}

      {bodyText && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{bodyText}</p>
        </div>
      )}

      {expandableSections.map((section) => (
        <ExpandableSection key={section.id} section={section} />
      ))}

      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onAction?.({ action: a.id })}
              disabled={a.disabled}
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

function CardDataItem({ item, onAction }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.value || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        {item.type === 'badge' && (
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              BADGE_COLORS[item.color] || BADGE_COLORS.default
            )}
          >
            {item.value}
          </span>
        )}

        {item.type === 'progress' && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', PROGRESS_COLORS[item.color] || PROGRESS_COLORS.default)}
                style={{ width: `${item.percent || 0}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.value}</span>
          </div>
        )}

        {item.type === 'link' && (
          <button
            onClick={() => onAction?.({ action: item.actionId })}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            {item.value} <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {item.type === 'copy' && (
          <button
            onClick={handleCopy}
            className="text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <span className="truncate">{item.value}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 shrink-0" />
            )}
          </button>
        )}

        {(!item.type || item.type === 'text') && (
          <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{item.value}</span>
        )}
      </div>
    </div>
  )
}

function ExpandableSection({ section }) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? false)

  return (
    <div className="border-t border-slate-100 dark:border-slate-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{section.title}</span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{section.content}</p>
        </div>
      )}
    </div>
  )
}
