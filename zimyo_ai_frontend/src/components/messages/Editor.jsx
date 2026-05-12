/**
 * Editor — renders ui.type === "editor"
 *
 * Standalone rich-text editor with its own action row (parallel to Form's actions).
 * Uses the shared _RichTextEditor primitive so styling matches when used inside Form.
 *
 * Spec fields:
 *   title?         - header text
 *   subtitle?      - small descriptor under title
 *   content        - initial HTML string (default '')
 *   format?        - "html" | "markdown" | "text"   (returned as values.format; only "html" is produced today)
 *   config?        - { toolbar?, placeholder?, minHeight?, readOnly? } — passed straight to primitive
 *   actions[]      - same shape as Form actions: { id, label, style, fullWidth?, disabled?, loading? }
 *
 * On action click:
 *   onAction({ action: action.id, values: { content: <html>, format: "html" } })
 * ChatMessage wraps that as JSON.stringify({action, ...values}) for the backend — same contract as Form.
 */

import { useState } from 'react'
import RichTextEditor from './_RichTextEditor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Editor({ msg, onAction }) {
  const { title, subtitle, content = '', format = 'html', config = {}, actions = [] } = msg

  const [html, setHtml] = useState(content)

  const handleAction = (action) => {
    onAction?.({
      action: action.id,
      values: { content: html, format },
    })
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-2">
          {title && <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="px-4 pb-3">
        <RichTextEditor value={html} onChange={setHtml} config={{ minHeight: 220, ...config }} />
      </div>

      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleAction(a)}
              disabled={a.disabled || a.loading}
              className={cn(
                'h-9 text-xs',
                a.fullWidth && 'flex-1',
                a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              )}
            >
              {a.loading ? 'Loading…' : a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
