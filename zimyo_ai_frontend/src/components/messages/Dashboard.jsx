/**
 * Dashboard — renders ui.type === "dashboard"
 *
 * Spec fields:
 *   title, greeting?, stats[], widgets[], alerts[], actions[]
 */

const STAT_COLORS = {
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  green: 'bg-green-50 border-green-200 text-green-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  red: 'bg-red-50 border-red-200 text-red-800',
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  teal: 'bg-teal-50 border-teal-200 text-teal-800',
  default: 'bg-gray-50 border-gray-200 text-gray-800',
}

const TREND_ICON = { up: '↑', down: '↓', stable: '→' }

export default function Dashboard({ msg, onAction }) {
  const { title, greeting, stats = [], widgets = [], actions = [] } = msg

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        {greeting && <p className="text-xs text-gray-500 mb-0.5">{greeting}</p>}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Stat cards */}
      {stats.length > 0 && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {stats.map(stat => (
            <button
              key={stat.id}
              onClick={() => stat.clickAction && onAction?.({ action: stat.clickAction })}
              className={`p-3 rounded-xl border text-left transition-all ${stat.clickAction ? 'cursor-pointer hover:shadow-sm' : ''} ${STAT_COLORS[stat.color] || STAT_COLORS.default}`}
            >
              <p className="text-[10px] text-inherit opacity-70">{stat.label}</p>
              <p className="text-lg font-bold mt-0.5">{stat.value}</p>
              {stat.trend && (
                <p className={`text-[10px] mt-0.5 ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                  {TREND_ICON[stat.trend]} {stat.trendValue}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Widgets */}
      {widgets.map(widget => (
        <div key={widget.id} className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">{widget.title}</span>
            {widget.viewAllAction && (
              <button onClick={() => onAction?.({ action: widget.viewAllAction })} className="text-[10px] text-zimyo-600 hover:underline">
                View all
              </button>
            )}
          </div>

          {/* Mini table */}
          {widget.type === 'mini_table' && widget.data?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {(widget.columns || []).map(col => (
                      <th key={col} className="py-1.5 text-left text-[10px] font-semibold text-gray-400 uppercase">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {widget.data.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {(widget.columns || []).map(col => (
                        <td key={col} className="py-1.5 text-gray-700">{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mini list */}
          {widget.type === 'mini_list' && (widget.data || []).map((item, i) => (
            <button
              key={i}
              onClick={() => item.clickAction && onAction?.({ action: item.clickAction })}
              className="w-full flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 text-left transition-colors"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-800">{item.title}</p>
                {item.subtitle && <p className="text-[10px] text-gray-500">{item.subtitle}</p>}
              </div>
              {item.date && <span className="text-[10px] text-gray-400 shrink-0">{item.date}</span>}
            </button>
          ))}

          {/* Avatar list */}
          {widget.type === 'avatar_list' && (widget.data || []).map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                {item.avatar || (item.name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                {item.subtitle && <p className="text-[10px] text-gray-500">{item.subtitle}</p>}
              </div>
              {item.status && <span className="text-[10px] text-gray-400 shrink-0">{item.status}</span>}
            </div>
          ))}

          {/* Empty */}
          {(!widget.data || widget.data.length === 0) && widget.emptyText && (
            <p className="text-xs text-gray-400 py-2">{widget.emptyText}</p>
          )}
        </div>
      ))}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-3 pt-2 flex gap-2 border-t border-gray-100">
          {actions.map(a => (
            <button key={a.id} onClick={() => onAction?.({ action: a.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                a.style === 'primary' ? 'bg-zimyo-600 hover:bg-zimyo-700 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
