import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { Battery, Wrench, Truck, Clock, ChevronRight, X, Camera } from 'lucide-react'
import { useOpsStore } from '@/stores/opsStore'
import BatteryBar from '@/components/BatteryBar'
import type { OpsTask, OpsTaskType } from '@/types'

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

const faultTypeLabels: Record<string, string> = {
  brake_failure: '刹车故障',
  tire_damage: '轮胎损坏',
  chain_issue: '链条问题',
  motor_fault: '电机故障',
  controller_error: '控制器故障',
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
            <span className="number-font text-sm font-bold text-zinc-900">{task.vehicleCode || task.vehicleId}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors[1]}`}>P{task.priority}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-400">{config.label}</span>
            {task.battery !== undefined && <BatteryBar level={task.battery} showLabel={false} />}
            {task.faultType && <span className="text-xs text-red-500">{faultTypeLabels[task.faultType] || task.faultType}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="w-3 h-3" />
          {new Date(task.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {(task.faultType || (task.faultPhotos && task.faultPhotos.length > 0)) && (
        <div className="mt-2 ml-12 flex items-center gap-2">
          {task.faultPhotos && task.faultPhotos.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Camera className="w-3 h-3" />
              <span>{task.faultPhotos.length}张照片</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskDetail({ task, onClose, onComplete }: { task: OpsTask; onClose: () => void; onComplete: (id: string) => void }) {
  const config = typeConfig[task.type]
  const Icon = config.icon
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await onComplete(task.id)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-zinc-900">任务详情</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900">{config.label}任务</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors[1]}`}>P{task.priority}</span>
            </div>
            <p className="text-sm text-zinc-500">车辆编号: <span className="number-font font-medium text-zinc-900">{task.vehicleCode || task.vehicleId}</span></p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">状态</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              {task.status === 'pending' ? '待处理' : task.status === 'in_progress' ? '进行中' : '已完成'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">创建时间</span>
            <span className="text-sm text-zinc-900">{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          {task.faultType && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">故障类型</span>
              <span className="text-sm text-red-500 font-medium">{faultTypeLabels[task.faultType] || task.faultType}</span>
            </div>
          )}
          {task.battery !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">电量</span>
              <span className="number-font text-sm text-zinc-900">{task.battery}%</span>
            </div>
          )}
        </div>

        {task.faultPhotos && task.faultPhotos.length > 0 && (
          <div className="mb-5">
            <p className="text-sm text-zinc-500 mb-2">故障照片</p>
            <div className="flex gap-2 overflow-x-auto">
              {task.faultPhotos.map((photo, i) => (
                <img key={i} src={photo} alt={`故障照片${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-zinc-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ))}
            </div>
          </div>
        )}

        {task.status !== 'completed' && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full btn-primary py-2.5 disabled:opacity-50"
          >
            {completing ? '处理中...' : '标记完成'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function TaskList() {
  const { tasks, fetchTasks, completeTask } = useOpsStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const sorted = [...tasks].sort((a, b) => b.priority - a.priority)
  const selected = sorted.find((t) => t.id === selectedId)

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-zinc-200 bg-white overflow-y-auto p-4">
        <h2 className="font-bold text-zinc-900 mb-3">待处理任务</h2>
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-sm">暂无任务</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((task) => (
              <TaskCard key={task.id} task={task} selected={selectedId === task.id} onClick={() => setSelectedId(task.id)} />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1">
        <MapContainer center={[39.907, 116.410]} zoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </div>
      {selected && (
        <TaskDetail task={selected} onClose={() => setSelectedId(null)} onComplete={completeTask} />
      )}
    </div>
  )
}
