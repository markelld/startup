interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  positive?: boolean
  negative?: boolean
  neutral?: boolean
}

export default function StatCard({ label, value, subValue, positive, negative, neutral }: StatCardProps) {
  const valueColor = positive
    ? 'text-green'
    : negative
    ? 'text-red'
    : neutral
    ? 'text-blue'
    : 'text-white'

  return (
    <div className="card py-2.5 px-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-lg font-mono font-semibold ${valueColor}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  )
}
