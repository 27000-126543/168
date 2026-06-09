import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Clock, X } from 'lucide-react'
import { usePricingStore } from '@/stores/pricingStore'
import type { PricingRule, PricingTimeSlot } from '@/types'

const MOCK_RULES: PricingRule[] = [
  { id: '1', name: '标准计价', timeSlots: [{ start: '06:00', end: '22:00', basePrice: 2, timeRate: 1, distanceRate: 0.5 }], active: true, createdAt: '2026-01-01' },
  { id: '2', name: '夜间计价', timeSlots: [{ start: '22:00', end: '06:00', basePrice: 3, timeRate: 1.5, distanceRate: 0.8 }], active: true, createdAt: '2026-01-01' },
  { id: '3', name: '高峰计价', timeSlots: [{ start: '07:00', end: '09:00', basePrice: 2.5, timeRate: 1.2, distanceRate: 0.6 }, { start: '17:00', end: '19:00', basePrice: 2.5, timeRate: 1.2, distanceRate: 0.6 }], active: false, createdAt: '2026-03-01' },
]

function RuleForm({ rule, onSave, onClose }: { rule?: PricingRule; onSave: (data: any) => void; onClose: () => void }) {
  const [name, setName] = useState(rule?.name || '')
  const [timeSlots, setTimeSlots] = useState<PricingTimeSlot[]>(rule?.timeSlots || [{ start: '06:00', end: '22:00', basePrice: 2, timeRate: 1, distanceRate: 0.5 }])
  const [active, setActive] = useState(rule?.active ?? true)

  const addSlot = () => setTimeSlots([...timeSlots, { start: '', end: '', basePrice: 0, timeRate: 0, distanceRate: 0 }])
  const removeSlot = (i: number) => setTimeSlots(timeSlots.filter((_, idx) => idx !== i))
  const updateSlot = (i: number, field: keyof PricingTimeSlot, value: string | number) => {
    setTimeSlots(timeSlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{rule ? '编辑规则' : '新增规则'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-1.5">规则名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-zinc-600">时段配置</label>
              <button onClick={addSlot} className="text-xs text-brand-700 flex items-center gap-1"><Plus className="w-3 h-3" />添加时段</button>
            </div>
            {timeSlots.map((slot, i) => (
              <div key={i} className="bg-zinc-50 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <input type="time" value={slot.start} onChange={(e) => updateSlot(i, 'start', e.target.value)} className="px-2 py-1 border border-zinc-200 rounded text-sm" />
                  <span className="text-zinc-400">~</span>
                  <input type="time" value={slot.end} onChange={(e) => updateSlot(i, 'end', e.target.value)} className="px-2 py-1 border border-zinc-200 rounded text-sm" />
                  {timeSlots.length > 1 && <button onClick={() => removeSlot(i)} className="ml-auto"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-zinc-400">起步价</label><input type="number" value={slot.basePrice} onChange={(e) => updateSlot(i, 'basePrice', Number(e.target.value))} className="w-full px-2 py-1 border border-zinc-200 rounded text-sm number-font" /></div>
                  <div><label className="text-[10px] text-zinc-400">时长费/min</label><input type="number" value={slot.timeRate} onChange={(e) => updateSlot(i, 'timeRate', Number(e.target.value))} className="w-full px-2 py-1 border border-zinc-200 rounded text-sm number-font" /></div>
                  <div><label className="text-[10px] text-zinc-400">里程费/km</label><input type="number" value={slot.distanceRate} onChange={(e) => updateSlot(i, 'distanceRate', Number(e.target.value))} className="w-full px-2 py-1 border border-zinc-200 rounded text-sm number-font" /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-zinc-600">启用状态</label>
            <button onClick={() => setActive(!active)} className={`w-10 h-6 rounded-full transition-colors ${active ? 'bg-brand-700' : 'bg-zinc-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${active ? 'translate-x-4' : ''}`} />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-outline">取消</button>
            <button onClick={() => onSave({ name, timeSlots, active })} className="flex-1 btn-primary">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pricing() {
  const { rules, fetchRules, createRule, updateRule } = usePricingStore()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | undefined>()

  useEffect(() => { fetchRules() }, [fetchRules])

  const list = rules.length > 0 ? rules : MOCK_RULES

  const handleSave = async (data: any) => {
    try {
      if (editingRule) {
        await updateRule(editingRule.id, data)
      } else {
        await createRule(data)
      }
      setShowForm(false)
      setEditingRule(undefined)
    } catch {}
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">计价规则</h1>
        <button onClick={() => { setEditingRule(undefined); setShowForm(true) }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />新增规则</button>
      </div>
      <div className="space-y-4">
        {list.map((rule) => (
          <div key={rule.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-zinc-900">{rule.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>{rule.active ? '已启用' : '已停用'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingRule(rule); setShowForm(true) }} className="p-1.5 rounded-lg hover:bg-zinc-100"><Edit2 className="w-4 h-4 text-zinc-400" /></button>
                <button className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
              </div>
            </div>
            <div className="space-y-2">
              {rule.timeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-4 text-sm bg-zinc-50 rounded-lg px-3 py-2">
                  <span className="text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{slot.start} ~ {slot.end}</span>
                  <span className="text-zinc-600">起步 <span className="number-font font-medium">¥{slot.basePrice}</span></span>
                  <span className="text-zinc-600">时长 <span className="number-font font-medium">¥{slot.timeRate}/min</span></span>
                  <span className="text-zinc-600">里程 <span className="number-font font-medium">¥{slot.distanceRate}/km</span></span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {showForm && <RuleForm rule={editingRule} onSave={handleSave} onClose={() => { setShowForm(false); setEditingRule(undefined) }} />}
    </div>
  )
}
