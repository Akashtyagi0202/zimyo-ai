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
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export default function PdfPreview({ msg, onAction }) {
  const { title, subtitle, url, height = 600, actions = [] } = msg
  const [loading, setLoading] = useState(true)

  const handleAction = (a) => onAction?.({ action: a.id, values: { url } })

  if (!url) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 max-w-2xl mt-2 text-sm text-rose-700 dark:text-rose-300">
        Preview unavailable — missing PDF url.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
                >
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open in new tab</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
                >
                  <a href={url} download>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800/60 rounded-lg animate-pulse text-xs text-slate-400 dark:text-slate-500">
              Loading PDF…
            </div>
          )}
          <iframe
            src={url}
            title={title || 'PDF Preview'}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-100"
            style={{ height: `${height}px` }}
            onLoad={() => setLoading(false)}
          />
        </div>
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
