/**
 * Chips — renders ui.type === "chips"
 *
 * Generic action chips for picking one value from a list.
 *
 * Spec fields:
 *   title?, chips[]: { label, sublabel?, value }
 *
 * Render mode:
 *   - "list-pickers" (any chip has sublabel, or chips.length >= 5) →
 *     searchable dropdown (better at scale; admin can type to filter).
 *   - Simple option sets (no sublabel, < 5 items, e.g. yes/no, navigation
 *     prompts) → row of pill buttons.
 *   The mode is auto-selected from the data shape — backend keeps sending
 *   `type: "chips"`; the renderer picks the right UI.
 *
 * onClick / onSelect → onAction({ value: chip.value })
 */

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const COLORS = [
  'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20 dark:hover:bg-rose-500/20',
  'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 dark:hover:bg-blue-500/20',
  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20',
  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 dark:hover:bg-amber-500/20',
  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20 dark:hover:bg-violet-500/20',
  'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:border-pink-300 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20 dark:hover:bg-pink-500/20',
  'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20 dark:hover:bg-cyan-500/20',
  'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20 dark:hover:bg-orange-500/20',
]

function shouldUseDropdown(chips) {
  if (chips.length >= 5) return true
  return chips.some((c) => c.sublabel)
}

function ChipButtons({ chips, onAction }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <button
          key={`${chip.value}-${i}`}
          onClick={() => onAction?.({ value: chip.value })}
          className={cn(
            'animate-stagger inline-flex items-center px-3.5 py-1.5 rounded-full border text-xs font-medium',
            'transition-all active:scale-95 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            COLORS[i % COLORS.length]
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {chip.label}
          {chip.sublabel && <span className="ml-1 opacity-70">· {chip.sublabel}</span>}
        </button>
      ))}
    </div>
  )
}

function SearchableDropdown({ chips, onAction }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chips
    return chips.filter((c) => {
      const label = (c.label || '').toLowerCase()
      const sub = (c.sublabel || '').toLowerCase()
      return label.includes(q) || sub.includes(q)
    })
  }, [query, chips])

  return (
    <div className="relative">
      <Input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Search ${chips.length} options…`}
        className="h-9 rounded-xl"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">No matches</div>
          ) : (
            filtered.map((chip, i) => (
              <button
                key={`${chip.value}-${i}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onAction?.({ value: chip.value })
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 active:bg-indigo-100 dark:active:bg-indigo-500/20 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-b-0"
              >
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{chip.label}</div>
                {chip.sublabel && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chip.sublabel}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function Chips({ msg, onAction }) {
  const { title, chips = [] } = msg
  if (!chips.length) return null

  const useDropdown = shouldUseDropdown(chips)

  return (
    <div className="mt-2 w-full max-w-md animate-fade-in-scale">
      {title && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{title}</p>}
      {useDropdown ? <SearchableDropdown chips={chips} onAction={onAction} /> : <ChipButtons chips={chips} onAction={onAction} />}
    </div>
  )
}
