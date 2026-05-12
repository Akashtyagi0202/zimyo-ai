import {
  LineChart as ReLineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function LineChart({ msg }) {
  const { title, data = [], x_key, y_keys = [] } = msg
  if (!data.length) return null

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      {title && <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <ReLineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey={x_key} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
          <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {y_keys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
