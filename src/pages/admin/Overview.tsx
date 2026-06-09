import { Bike, DollarSign, Wrench, TrendingUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '@/components/StatCard'

const ACTIVITIES = [
  { time: '10:30', text: '用户 张三 完成骑行，费用 ¥5.50', type: 'ride' },
  { time: '10:15', text: '运维 李四 完成换电任务 EB-0012', type: 'ops' },
  { time: '09:45', text: 'EB-0034 故障举报：刹车故障', type: 'fault' },
  { time: '09:30', text: '新用户 138****5678 注册', type: 'register' },
  { time: '09:00', text: '系统生成6月运营报告', type: 'report' },
]

const activityIcons: Record<string, string> = {
  ride: '🚲',
  ops: '🔧',
  fault: '⚠️',
  register: '👤',
  report: '📊',
}

export default function Overview() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">管理概览</h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Bike className="w-5 h-5" />} label="总骑行量" value="12,580" trend={8.3} />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="总收入" value="¥68,420" trend={5.1} />
        <StatCard icon={<Wrench className="w-5 h-5" />} label="运维成本" value="¥12,350" trend={-2.4} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="净利润" value="¥56,070" trend={6.8} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 card">
          <h2 className="font-bold text-zinc-900 mb-4">最近动态</h2>
          <div className="space-y-3">
            {ACTIVITIES.map((act, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-lg">{activityIcons[act.type]}</span>
                <span className="flex-1 text-zinc-600">{act.text}</span>
                <span className="text-zinc-400 text-xs number-font">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-zinc-900 mb-4">快捷入口</h2>
          <div className="space-y-2">
            {[
              { label: '计价规则管理', to: '/admin/pricing', icon: DollarSign },
              { label: '天气调价配置', to: '/admin/weather', icon: TrendingUp },
              { label: '运营报告', to: '/admin/reports', icon: Bike },
              { label: '用户管理', to: '/admin/users', icon: Wrench },
            ].map(({ label, to, icon: Icon }) => (
              <button key={to} onClick={() => navigate(to)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-left">
                <Icon className="w-4 h-4 text-brand-600" />
                <span className="flex-1 text-sm text-zinc-700">{label}</span>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
