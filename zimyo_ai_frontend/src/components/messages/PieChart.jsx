import {
  PieChart as RePieChart, Pie, Cell,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function PieChart({ msg }) {
  const { title, data = [], name_key, value_key } = msg
  if (!data.length) return null

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 w-full max-w-sm mt-2 animate-fade-in-scale shadow-sm">
      {title && <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <RePieChart>
          <Pie data={data} dataKey={value_key} nameKey={name_key} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  )
}
