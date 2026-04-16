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

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white shadow-sm',
  ghost:   'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
  danger:  'bg-red-600 hover:bg-red-700 text-white',
}

export default function Editor({ msg, onAction }) {
  const {
    title,
    subtitle,
    content = '',
    format = 'html',
    config = {},
    actions = [],
  } = msg

  const [html, setHtml] = useState(content)

  const handleAction = (action) => {
    onAction?.({
      action: action.id,
      values: { content: html, format },
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale">
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-2">
          {title    && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="px-4 pb-3">
        <RichTextEditor
          value={html}
          onChange={setHtml}
          config={{ minHeight: 220, ...config }}
        />
      </div>

      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-100">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => handleAction(a)}
              disabled={a.disabled || a.loading}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${
                a.fullWidth ? 'flex-1' : ''
              } ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}
            >
              {a.loading ? 'Loading...' : a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
