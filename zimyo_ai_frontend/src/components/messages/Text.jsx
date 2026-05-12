/**
 * Text — renders ui.type === "text"
 *
 * Backend contract (services/ai/planner/_message_helpers.py::_empty_text):
 *   { type: "text", title, message }
 *
 * Used as `api_result` for empty / cancelled / no-data states (e.g.
 * "No workflows", "Cancelled — no email was sent"). Plain title + message
 * card with no actions.
 */

import { Info } from 'lucide-react'

export default function Text({ msg }) {
  const { title, message } = msg
  if (!title && !message) return null

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 w-full max-w-md mt-2 animate-fade-in-scale">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 bg-slate-100 dark:bg-slate-700/60 rounded-lg flex items-center justify-center shrink-0">
          <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
          )}
          {message && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-line">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
