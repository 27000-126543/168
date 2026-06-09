import { useState } from 'react'
import { ScanLine, CheckCircle, Upload, Battery, X } from 'lucide-react'
import { useOpsStore } from '@/stores/opsStore'
import { useNavigate } from 'react-router-dom'

export default function ScanConfirm() {
  const [scanning, setScanning] = useState(true)
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [repairPhotos, setRepairPhotos] = useState<string[]>([])
  const [taskType, setTaskType] = useState<'battery_swap' | 'repair'>('battery_swap')
  const [completed, setCompleted] = useState(false)
  const { completeTask } = useOpsStore()
  const navigate = useNavigate()

  const simulateScan = () => {
    setTimeout(() => {
      setScanning(false)
      setTaskType(Math.random() > 0.5 ? 'battery_swap' : 'repair')
    }, 1500)
  }

  const handleConfirm = async () => {
    try {
      await completeTask('1', repairPhotos)
      setCompleted(true)
    } catch {}
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map((f) => f.name)
      setRepairPhotos((prev) => [...prev, ...names].slice(0, 3))
    }
  }

  if (completed) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50">
        <div className="text-center p-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">任务完成</h2>
          <p className="text-zinc-400 text-sm mb-6">已成功确认完成当前任务</p>
          <button onClick={() => navigate('/ops')} className="btn-primary">返回任务列表</button>
        </div>
      </div>
    )
  }

  if (scanning) {
    simulateScan()
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="w-64 h-64 mx-auto border-2 border-brand-400 rounded-2xl relative mb-6">
            <div className="absolute left-4 right-4 h-0.5 bg-brand-400" style={{ animation: 'scan-line 1.5s ease-in-out infinite alternate', top: '50%' }} />
            <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-brand-400 animate-pulse" />
          </div>
          <p className="text-white text-lg">扫描车辆二维码</p>
          <p className="text-zinc-400 text-sm mt-1">请将二维码对准扫描框</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-zinc-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">任务确认</h3>
          <button onClick={() => setScanning(true)}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <div className="bg-zinc-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${taskType === 'battery_swap' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              {taskType === 'battery_swap' ? <Battery className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium">{taskType === 'battery_swap' ? '换电任务' : '维修任务'}</p>
              <p className="text-xs text-zinc-400 number-font">EB-0012</p>
            </div>
          </div>
        </div>

        {taskType === 'battery_swap' ? (
          <div className="mb-4">
            <label className="block text-sm text-zinc-600 mb-2">新电池电量</label>
            <input type="range" min={0} max={100} value={batteryLevel} onChange={(e) => setBatteryLevel(Number(e.target.value))} className="w-full accent-brand-700" />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>0%</span>
              <span className="number-font text-brand-700 font-bold text-sm">{batteryLevel}%</span>
              <span>100%</span>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm text-zinc-600 mb-2">维修确认照片</label>
            <div className="flex gap-2">
              {repairPhotos.map((name, i) => (
                <div key={i} className="w-20 h-20 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-500 truncate px-1">{name}</div>
              ))}
              {repairPhotos.length < 3 && (
                <label className="w-20 h-20 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100">
                  <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                  <span className="text-[10px] text-zinc-400">上传</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        )}

        <button onClick={handleConfirm} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />确认完成
        </button>
      </div>
    </div>
  )
}
