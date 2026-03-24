import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface DisciplineRingProps {
  score: number | null
}

export default function DisciplineRing({ score }: DisciplineRingProps) {
  const value = score ?? 0
  const color = value >= 70 ? '#00D49C' : value >= 50 ? '#F5A623' : '#FF4D6A'

  const data = [{ value, fill: color }]

  return (
    <div className="card flex flex-col items-center justify-center">
      <h3 className="text-sm font-medium text-gray-400 mb-2">Discipline Score</h3>
      <div className="relative">
        <ResponsiveContainer width={120} height={120}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#2A2A3A' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-mono font-bold" style={{ color }}>
            {value.toFixed(0)}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">out of 100</p>
    </div>
  )
}
