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
 *     prompts) → row of buttons (current behavior).
 *   The mode is auto-selected from the data shape — backend keeps sending
 *   `type: "chips"`; the renderer picks the right UI.
 *
 * onClick / onSelect → onAction({ value: chip.value })
 */

import { useMemo, useState } from 'react'

const COLORS = [
  'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300',
  'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300',
  'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
  'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300',
  'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
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
          className={`animate-stagger px-3.5 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 hover:shadow-sm ${COLORS[i % COLORS.length]}`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {chip.label}
          {chip.sublabel && (
            <span className="ml-1 opacity-70">· {chip.sublabel}</span>
          )}
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
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Search ${chips.length} options…`}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-500">No matches</div>
          ) : (
            filtered.map((chip, i) => (
              <button
                key={`${chip.value}-${i}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onAction?.({ value: chip.value })
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="text-sm font-medium text-gray-800">{chip.label}</div>
                {chip.sublabel && (
                  <div className="text-xs text-gray-500 mt-0.5">{chip.sublabel}</div>
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
      {title && (
        <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      )}
      {useDropdown ? (
        <SearchableDropdown chips={chips} onAction={onAction} />
      ) : (
        <ChipButtons chips={chips} onAction={onAction} />
      )}
    </div>
  )
}
