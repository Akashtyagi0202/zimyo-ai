/**
 * Chips — renders ui.type === "chips"
 *
 * Generic action chips for picking one value from a list.
 *
 * Spec fields:
 *   title?, chips[]: { label, sublabel?, value }
 *
 * onClick → onAction({ value: chip.value })
 */

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

export default function Chips({ msg, onAction }) {
  const { title, chips = [] } = msg
  if (!chips.length) return null

  return (
    <div className="mt-2 w-full max-w-md animate-fade-in-scale">
      {title && (
        <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      )}
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
    </div>
  )
}
