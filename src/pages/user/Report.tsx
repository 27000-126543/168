import { useState } from 'react'
import { AlertTriangle, Camera, Send, CheckCircle } from 'lucide-react'
import { useUserStore } from '@/stores/userStore'

const FAULT_TYPES = ['刹车故障', '轮胎漏气', '电池异常', '车锁故障', '车身损坏', '其他']

export default function Report() {
  const [vehicleCode, setVehicleCode] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { reportFault } = useUserStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map((f) => f.name)
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 4))
    }
  }

  const handleSubmit = async () => {
    if (!vehicleCode || !selectedType) return
    try {
      await reportFault({ vehicleCode, faultType: selectedType, photos, description })
      setSubmitted(true)
    } catch {}
  }

  if (submitted) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center py-16">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-zinc-900 mb-2">举报成功</h2>
        <p className="text-zinc-400 text-sm mb-6">系统已自动派单给最近运维人员</p>
        <button onClick={() => { setSubmitted(false); setVehicleCode(''); setSelectedType(''); setPhotos([]); setDescription('') }} className="btn-outline">继续举报</button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-zinc-900 mb-4">故障举报</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-600 mb-1.5">车辆编号</label>
          <input type="text" value={vehicleCode} onChange={(e) => setVehicleCode(e.target.value)} placeholder="请输入车辆编号，如 EB-0012" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 mb-1.5">故障类型</label>
          <div className="grid grid-cols-3 gap-2">
            {FAULT_TYPES.map((type) => (
              <button key={type} onClick={() => setSelectedType(type)} className={`py-2.5 rounded-lg text-sm font-medium transition-all ${selectedType === type ? 'bg-brand-50 text-brand-700 border-2 border-brand-700' : 'bg-zinc-50 text-zinc-600 border-2 border-transparent'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-zinc-600 mb-1.5">拍照上传（最多4张）</label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((name, i) => (
              <div key={i} className="w-20 h-20 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-500 truncate px-1">{name}</div>
            ))}
            {photos.length < 4 && (
              <label className="w-20 h-20 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100">
                <Camera className="w-5 h-5 text-zinc-400 mb-1" />
                <span className="text-[10px] text-zinc-400">添加照片</span>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm text-zinc-600 mb-1.5">问题描述</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="请描述故障情况..." rows={3} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 resize-none" />
        </div>
        <button onClick={handleSubmit} disabled={!vehicleCode || !selectedType} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
          <Send className="w-4 h-4" />提交举报
        </button>
      </div>
    </div>
  )
}
