import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { Battery, Wrench, Truck, Clock, ChevronRight } from 'lucide-react'
import { useOpsStore } from '@/stores/opsStore'
import BatteryBar from '@/components/BatteryBar'
import type { OpsTask, OpsTaskType } from '@/types'

const MOCK_TASKS: OpsTask[] = [
  { id: '1', type: 'battery_swap', vehicleId: 'v1', vehicleCode: 'EB-0012', vehicleLat: 39.905, vehicleLng: 116.405, battery: 12, status: 'pending', assignedTo: 'ops1', priority: 3, createdAt: '2026-06-09 08:30' },
  { id: '2', type: 'repair', vehicleId: 'v2', vehicleCode: 'EB-0034', vehicleLat: 39.908, vehicleLng: 116.412, faultType: '刹车故障', status: 'pending', assignedTo: 'ops1', priority: 2, createdAt: '2026-06-09 09:15' },
  { id: '3', type: 'dispatch', vehicleId: 'v3', vehicleCode: 'EB-0056', vehicleLat: 39.902, vehicleLng: 116.398, status: 'in_progress', assignedTo: 'ops1', priority: 1, createdAt: '2026-06-09 07:00' },
  { id: '4', type: 'battery_swap', vehicleId: 'v4', vehicleCode: 'EB-0078', vehicleLat: 39.911, vehicleLng: 116.420, battery: 8, status: 'pending', assignedTo: 'ops1', priority: 2, createdAt: '2026-06-09 10:00' },
]

const typeConfig: Record<OpsTaskType, { icon: typeof Battery; color: string; label: string }> = {
  battery_swap: { icon: Battery, color: 'text-blue-600 bg-blue-50', label: '换电' },
  repair: { icon: Wrench, color: 'text-red-600 bg-red-50', label: '维修' },
  dispatch: { icon: Truck, color: 'text-green-600 bg-green-50', label: '调度' },
}

const priorityColors: Record<number, string> = {
  3: 'bg-red-100 text-red-700',
  2: 'bg-yellow-100 text-yellow-700',
  1: 'bg-zinc-100 text-zinc-600',
}

function TaskCard({ task, selected, onClick }: { task: OpsTask; selected: boolean; onClick: () => void }) {
  const config = typeConfig[task.type]
  const Icon = config.icon
  return (
    <div onClick={onClick} className={`p-3 rounded-xl border cursor-pointer transition-all ${selected ? 'border-brand-700 bg-brand-50' : 'border-zinc-100 bg-white hover:bg-zinc-50'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="number-font text-sm font-bold text-zinc-900">{task.vehicleCode}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors[1]}`}>P{task.priority}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-400">{config.label}</span>
            {task.battery !== undefined && <BatteryBar level={task.battery} showLabel={false} />}
            {task.faultType && <span className="text-xs text-red-500">{task.faultType}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="w-3 h-3" />
          {task.createdAt.split(' ')[1]}
        </div>
      </div>
    </div>
  )
}

export default function TaskList() {
  const { tasks, fetchTasks } = useOpsStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const taskList = tasks.length > 0 ? tasks : MOCK_TASKS
  const sorted = [...taskList].sort((a, b) => b.priority - a.priority)

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-zinc-200 bg-white overflow-y-auto p-4">
        <h2 className="font-bold text-zinc-900 mb-3">待处理任务</h2>
        <div className="space-y-2">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} selected={selectedId === task.id} onClick={() => setSelectedId(task.id)} />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <MapContainer center={[39.907, 116.410]} zoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </div>
    </div>
  )
}
