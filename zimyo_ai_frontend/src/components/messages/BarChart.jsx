import {
  BarChart as ReBarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#00bcd4']

function fmtINR(v) { return `₹${(v / 100000).toFixed(1)}L` }

export default function BarChart({ msg }) {
  const { title, data = [], x_key, y_keys = [], y_label } = msg
  if (!data.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-2xl mt-2 animate-fade-in-scale">
      {title && <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <ReBarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={x_key} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtINR} tick={{ fontSize: 11 }} label={y_label ? { value: y_label, angle: -90, position: 'insideLeft', style: { fontSize: 10 } } : undefined} />
          <Tooltip formatter={(val) => fmtINR(val)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {y_keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
