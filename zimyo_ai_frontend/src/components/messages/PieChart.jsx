import {
  PieChart as RePieChart, Pie, Cell,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#00bcd4']

export default function PieChart({ msg }) {
  const { title, data = [], name_key, value_key } = msg
  if (!data.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-sm mt-2 animate-fade-in-scale">
      {title && <p className="text-sm font-semibold text-gray-800 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <RePieChart>
          <Pie data={data} dataKey={value_key} nameKey={name_key} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  )
}
