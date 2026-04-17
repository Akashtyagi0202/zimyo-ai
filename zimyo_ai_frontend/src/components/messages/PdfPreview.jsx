/**
 * PdfPreview — renders ui.type === "pdf"
 *
 * Generic hosted-PDF viewer (iframe). Browsers render PDFs natively.
 *
 * Spec fields:
 *   title?, subtitle?, url, height? (default 600), actions[]?
 *
 * On action click: onAction({ action: action.id, values: { url } })
 * (matches Form/Editor contract — backend gets {action, url} JSON.)
 */

import { useState } from 'react'
import { ExternalLink, Download } from 'lucide-react'

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white shadow-sm',
  ghost:   'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
  danger:  'bg-red-600 hover:bg-red-700 text-white',
}

export default function PdfPreview({ msg, onAction }) {
  const { title, subtitle, url, height = 600, actions = [] } = msg
  const [loading, setLoading] = useState(true)

  const handleAction = (a) => onAction?.({ action: a.id, values: { url } })

  if (!url) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-4 max-w-2xl mt-2 text-sm text-red-700">
        Preview unavailable — missing PDF url.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale">
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
          <div>
            {title    && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={url}
              download
              title="Download"
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg animate-pulse text-xs text-gray-400">
              Loading PDF…
            </div>
          )}
          <iframe
            src={url}
            title={title || 'PDF Preview'}
            className="w-full border border-gray-200 rounded-lg bg-white"
            style={{ height: `${height}px` }}
            onLoad={() => setLoading(false)}
          />
        </div>
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
