import { useState, useEffect, useCallback } from 'react'
import { ArrowUp, ArrowDown, Truck, Battery, Wrench, X, Download, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { useOpsStore } from '@/stores/opsStore'
import { api } from '@/utils/api'
import type { OpsTask } from '@/types'

const AREA_MAP: Record<string, string> = {
  area1: '朝阳区',
  area2: '海淀区',
  area3: '西城区',
  area4: '东城区',
  area5: '丰台区',
}

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

const typeOptions: Array<'全部' | OpsTask['type']> = ['全部', 'battery_swap', 'repair', 'dispatch']

const statusConfig = {
  pending: { label: '待处理', className: 'bg-yellow-900/60 text-yellow-300' },
  in_progress: { label: '进行中', className: 'bg-blue-900/60 text-blue-300' },
  completed: { label: '已完成', className: 'bg-green-900/60 text-green-300' },
}

const priorityConfig = {
  3: { label: '高', className: 'bg-red-900/60 text-red-300' },
  2: { label: '中', className: 'bg-yellow-900/60 text-yellow-300' },
  1: { label: '低', className: 'bg-zinc-700 text-zinc-300' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Dispatch() {
  const { allTasks, fetchAllTasks, loading } = useOpsStore()
  const [selectedArea, setSelectedArea] = useState<string>('全部')
  const [selectedType, setSelectedType] = useState<typeof typeOptions[number]>('全部')
  const [overtimeOnly, setOvertimeOnly] = useState(false)
  const [overtimeCheckResult, setOvertimeCheckResult] = useState<string | null>(null)
  const [checkingOvertime, setCheckingOvertime] = useState(false)
  const [detailTask, setDetailTask] = useState<OpsTask | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAllTasks()
  }, [fetchAllTasks])

  const areas = useCallback(() => {
    const uniqueAreas = Array.from(new Set(allTasks.map((t) => t.vehicleAreaId))).sort()
    return ['全部', ...uniqueAreas]
  }, [allTasks])()

  const filtered = allTasks.filter((t) => {
    if (selectedArea !== '全部' && t.vehicleAreaId !== selectedArea) return false
    if (selectedType !== '全部' && t.type !== selectedType) return false
    if (overtimeOnly && !t.overtime) return false
    return true
  })

  const handleOvertimeCheck = async () => {
    setCheckingOvertime(true)
    setOvertimeCheckResult(null)
    try {
      const res = await api.get<{ count: number }>('/ops/tasks/overtime-check')
      setOvertimeCheckResult(`已发送 ${res.count} 条超时通知`)
    } catch {
      setOvertimeCheckResult('检查失败，请重试')
    } finally {
      setCheckingOvertime(false)
    }
  }

  const adjustPriority = async (id: string, delta: number) => {
    const task = allTasks.find((t) => t.id === id)
    if (!task) return
    const newPriority = Math.max(1, Math.min(3, task.priority + delta))
    if (newPriority === task.priority) return
    setAdjustingId(id)
    try {
      await api.put(`/ops/tasks/${id}`, { priority: newPriority })
      useOpsStore.setState((state) => ({
        allTasks: state.allTasks.map((t) => (t.id === id ? { ...t, priority: newPriority } : t)),
      }))
    } finally {
      setAdjustingId(null)
    }
  }

  const downloadVoucher = (task: OpsTask) => {
    const lines = [
      `任务凭证`,
      `──────────────`,
      `任务类型: ${typeLabels[task.type]}`,
      `车辆编号: ${task.vehicleCode}`,
      `状态: ${statusConfig[task.status].label}`,
      `优先级: ${priorityConfig[task.priority as keyof typeof priorityConfig].label}`,
      `负责人: ${task.assignedTo}`,
      `创建时间: ${formatTime(task.createdAt)}`,
      task.completedAt ? `完成时间: ${formatTime(task.completedAt)}` : '',
      task.overtime ? '⚠ 已超时' : '',
      task.repairPhotos?.length ? `维修照片: ${task.repairPhotos.join(', ')}` : '',
      `──────────────`,
    ].filter(Boolean).join('\n')
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voucher-${task.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-white">调度管理</h1>
        <button
          onClick={handleOvertimeCheck}
          disabled={checkingOvertime}
          className="px-4 py-1.5 rounded-lg text-sm bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 transition-all"
        >
          {checkingOvertime ? '检查中...' : '检查超时'}
        </button>
      </div>

      {overtimeCheckResult && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-orange-900/40 text-orange-300 text-sm">
          {overtimeCheckResult}
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {areas.map((area) => {
            const label = area === '全部' ? '全部' : (AREA_MAP[area] || area)
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${selectedArea === area ? 'bg-brand-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2">
          {typeOptions.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${selectedType === type ? 'bg-brand-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              {type === '全部' ? '全部' : typeLabels[type]}
            </button>
          ))}
        </div>

        <div>
          <button
            onClick={() => setOvertimeOnly((v) => !v)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${overtimeOnly ? 'bg-red-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            仅超时
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">加载中...</div>
      ) : (
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 text-xs border-b border-zinc-700">
                <th className="text-left px-5 py-3">区域</th>
                <th className="text-left px-5 py-3">任务类型</th>
                <th className="text-left px-5 py-3">车辆编号</th>
                <th className="text-left px-5 py-3">创建时间</th>
                <th className="text-center px-5 py-3">优先级</th>
                <th className="text-center px-5 py-3">状态</th>
                <th className="text-center px-5 py-3">超时</th>
                <th className="text-center px-5 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const Icon = typeIcons[task.type]
                const status = statusConfig[task.status]
                const priority = priorityConfig[task.priority as keyof typeof priorityConfig]
                const isAdjusting = adjustingId === task.id
                return (
                  <tr
                    key={task.id}
                    className={`border-b border-zinc-700/50 hover:bg-zinc-700/30 ${task.status === 'completed' ? 'cursor-pointer' : ''}`}
                    onClick={() => task.status === 'completed' && setDetailTask(task)}
                  >
                    <td className="px-5 py-3 text-zinc-200">{AREA_MAP[task.vehicleAreaId] || task.vehicleAreaId}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-300">{typeLabels[task.type]}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-300">{task.vehicleCode}</td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">{formatTime(task.createdAt)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${priority.className}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        {task.overtime && <AlertTriangle className="w-3 h-3 text-red-400" />}
                        {status.label}
                        {task.overtime && (
                          <span className="bg-red-600 text-white text-[10px] px-1 rounded">超时提醒</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {task.overtime ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/60 text-red-300">超时</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => adjustPriority(task.id, 1)}
                          disabled={task.priority >= 3 || isAdjusting}
                          className="p-1 rounded hover:bg-zinc-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => adjustPriority(task.id, -1)}
                          disabled={task.priority <= 1 || isAdjusting}
                          className="p-1 rounded hover:bg-zinc-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-zinc-500">暂无任务</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetailTask(null)}>
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
              <h2 className="text-white font-semibold">任务详情</h2>
              <button onClick={() => setDetailTask(null)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-zinc-500">任务类型</span>
                  <p className="text-zinc-200">{typeLabels[detailTask.type]}</p>
                </div>
                <div>
                  <span className="text-zinc-500">车辆编号</span>
                  <p className="text-zinc-200">{detailTask.vehicleCode}</p>
                </div>
                <div>
                  <span className="text-zinc-500">状态</span>
                  <p className={`inline-flex items-center gap-1 ${statusConfig[detailTask.status].className} px-2 py-0.5 rounded-full text-xs font-medium`}>
                    {statusConfig[detailTask.status].label}
                    {detailTask.overtime && <AlertTriangle className="w-3 h-3 text-red-400" />}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">优先级</span>
                  <p className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[detailTask.priority as keyof typeof priorityConfig].className}`}>
                    {priorityConfig[detailTask.priority as keyof typeof priorityConfig].label}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">负责人</span>
                  <p className="text-zinc-200">{detailTask.assignedTo}</p>
                </div>
                <div>
                  <span className="text-zinc-500">区域</span>
                  <p className="text-zinc-200">{AREA_MAP[detailTask.vehicleAreaId] || detailTask.vehicleAreaId}</p>
                </div>
              </div>

              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>创建: {formatTime(detailTask.createdAt)}</span>
                </div>
                {detailTask.completedAt && (
                  <div className="flex items-center gap-1 text-zinc-400">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span>完成: {formatTime(detailTask.completedAt)}</span>
                  </div>
                )}
              </div>

              {detailTask.overtime && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-800/50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-xs">此任务已超时</span>
                </div>
              )}

              {detailTask.repairPhotos && detailTask.repairPhotos.length > 0 && (
                <div>
                  <span className="text-zinc-500 text-xs">维修照片</span>
                  <ul className="mt-1 space-y-1">
                    {detailTask.repairPhotos.map((photo, i) => (
                      <li key={i} className="text-zinc-300 text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                        {photo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-700">
              <button
                onClick={() => downloadVoucher(detailTask)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-600 text-white text-sm transition-all"
              >
                <Download className="w-4 h-4" />
                下载凭证
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
