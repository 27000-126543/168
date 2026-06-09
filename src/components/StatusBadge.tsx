import type { VehicleStatus } from '@/types'

const config: Record<VehicleStatus, { label: string; className: string }> = {
  available: { label: '可用', className: 'bg-green-100 text-green-700' },
  riding: { label: '骑行中', className: 'bg-blue-100 text-blue-700' },
  low_battery: { label: '低电量', className: 'bg-orange-100 text-orange-700' },
  maintenance: { label: '维护中', className: 'bg-yellow-100 text-yellow-700' },
  fault: { label: '故障', className: 'bg-red-100 text-red-700' },
}

export default function StatusBadge({ status }: { status: VehicleStatus }) {
  const { label, className } = config[status]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>
}
