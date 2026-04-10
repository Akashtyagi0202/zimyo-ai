const COLOR_MAP = {
  default: 'bg-gray-50 text-gray-800 border-gray-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
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
      {title && <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card, i) => (
          <div key={i} className={`rounded-xl p-3 border ${COLOR_MAP[card.color ?? 'default']}`}>
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className="text-xl font-semibold">{formatVal(card.value, card.format)}</div>
            {card.trend && (
              <div className={`text-xs mt-1 ${card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
