import { useState } from 'react'
import { ArrowUp, ArrowDown, Truck, Battery, Wrench } from 'lucide-react'

interface DispatchTask {
  id: string
  area: string
  type: 'battery_swap' | 'repair' | 'dispatch'
  priority: number
  status: 'pending' | 'in_progress' | 'completed'
}

const MOCK_TASKS: DispatchTask[] = [
  { id: '1', area: '朝阳区', type: 'battery_swap', priority: 3, status: 'pending' },
  { id: '2', area: '海淀区', type: 'repair', priority: 2, status: 'in_progress' },
  { id: '3', area: '东城区', type: 'dispatch', priority: 1, status: 'pending' },
  { id: '4', area: '西城区', type: 'battery_swap', priority: 2, status: 'pending' },
  { id: '5', area: '朝阳区', type: 'repair', priority: 3, status: 'completed' },
  { id: '6', area: '海淀区', type: 'dispatch', priority: 1, status: 'pending' },
]

const areas = ['全部', '朝阳区', '海淀区', '东城区', '西城区']

const typeIcons = {
  battery_swap: Battery,
  repair: Wrench,
  dispatch: Truck,
}

const typeLabels = {
  battery_swap: '换电',
  repair: '维修',
  dispatch: '调度',
}

const statusConfig = {
  pending: { label: '待处理', className: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
}

const priorityConfig = {
  3: { label: '高', className: 'bg-red-100 text-red-700' },
  2: { label: '中', className: 'bg-yellow-100 text-yellow-700' },
  1: { label: '低', className: 'bg-zinc-100 text-zinc-600' },
}

export default function Dispatch() {
  const [selectedArea, setSelectedArea] = useState('全部')
  const [tasks, setTasks] = useState(MOCK_TASKS)

  const filtered = selectedArea === '全部' ? tasks : tasks.filter((t) => t.area === selectedArea)

  const adjustPriority = (id: string, delta: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: Math.max(1, Math.min(3, t.priority + delta)) } : t))
    )
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <h1 className="text-lg font-bold text-white mb-4">调度管理</h1>

      <div className="flex gap-2 mb-6">
        {areas.map((area) => (
          <button key={area} onClick={() => setSelectedArea(area)} className={`px-4 py-1.5 rounded-lg text-sm transition-all ${selectedArea === area ? 'bg-brand-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {area}
          </button>
        ))}
      </div>

      <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 text-xs border-b border-zinc-700">
              <th className="text-left px-5 py-3">区域</th>
              <th className="text-left px-5 py-3">任务类型</th>
              <th className="text-center px-5 py-3">优先级</th>
              <th className="text-center px-5 py-3">状态</th>
              <th className="text-center px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const Icon = typeIcons[task.type]
              const status = statusConfig[task.status]
              const priority = priorityConfig[task.priority as keyof typeof priorityConfig]
              return (
                <tr key={task.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                  <td className="px-5 py-3 text-zinc-200">{task.area}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-300">{typeLabels[task.type]}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${priority.className}`}>{priority.label}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => adjustPriority(task.id, 1)} disabled={task.priority >= 3} className="p-1 rounded hover:bg-zinc-600 disabled:opacity-30"><ArrowUp className="w-4 h-4 text-zinc-400" /></button>
                      <button onClick={() => adjustPriority(task.id, -1)} disabled={task.priority <= 1} className="p-1 rounded hover:bg-zinc-600 disabled:opacity-30"><ArrowDown className="w-4 h-4 text-zinc-400" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
