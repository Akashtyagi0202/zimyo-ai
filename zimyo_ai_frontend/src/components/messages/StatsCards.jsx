import { cn } from '@/lib/utils'

const COLOR_MAP = {
  default: 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700',
  success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/30',
  warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-500/30',
  danger: 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-500/30',
  info: 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-500/30',
}

function formatVal(value, format) {
  if (format === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`
  if (format === 'percent') return `${value}%`
  return value
}

export default function StatsCards({ msg }) {
  const { title, cards = [] } = msg
  if (!cards.length) return null

  return (
    <div className="w-full max-w-2xl mt-2 animate-fade-in-scale">
      {title && <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</p>}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card, i) => (
          <div key={i} className={cn('rounded-xl p-3 border', COLOR_MAP[card.color ?? 'default'])}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{card.label}</div>
            <div className="text-xl font-semibold">{formatVal(card.value, card.format)}</div>
            {card.trend && (
              <div
                className={cn(
                  'text-xs mt-1',
                  card.trend.startsWith('+')
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {card.trend}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
