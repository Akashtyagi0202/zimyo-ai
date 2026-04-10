import {
  LineChart as ReLineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0']

export default function LineChart({ msg }) {
  const { title, data = [], x_key, y_keys = [] } = msg
  if (!data.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-2xl mt-2 animate-fade-in-scale">
      {title && <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <ReLineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={x_key} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {y_keys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
