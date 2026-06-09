import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { Bike, FileText, AlertTriangle, Bell, Settings, ChevronRight, Wallet, LogOut } from 'lucide-react'
import BatteryBar from '@/components/BatteryBar'

export default function Profile() {
  const { user, logout, fetchMe } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { fetchMe() }, [fetchMe])

  const creditScore = user?.creditScore ?? 100

  const creditColor = creditScore >= 80 ? 'text-green-600' : creditScore >= 60 ? 'text-yellow-600' : 'text-red-600'
  const creditBg = creditScore >= 80 ? 'bg-green-500' : creditScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const creditBarBg = creditScore >= 80 ? 'bg-green-100' : creditScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'

  const menus = [
    { icon: FileText, label: '账户明细', to: '/user/account' },
    { icon: Bike, label: '骑行记录', to: '/user/history' },
    { icon: AlertTriangle, label: '故障举报', to: '/user/report' },
    { icon: Bell, label: '消息中心', to: '/notifications' },
    { icon: Settings, label: '设置', to: '#' },
  ]

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-700 font-bold text-xl">{user?.name?.[0] || 'U'}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-zinc-900">{user?.name || '用户'}</h2>
            <p className="text-sm text-zinc-400">{user?.phone || '138****0001'}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold number-font ${creditColor} ${creditBarBg}`}>
            {creditScore}分
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-zinc-500">信用分</span>
            <span className={`number-font font-medium ${creditColor}`}>{creditScore}/100</span>
          </div>
          <div className={`h-2 rounded-full ${creditBarBg}`}>
            <div className={`h-full rounded-full transition-all ${creditBg}`} style={{ width: `${creditScore}%` }} />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-brand-600" />
          <div className="flex-1">
            <p className="text-sm text-zinc-500">账户余额</p>
            <p className="number-font text-xl font-bold text-zinc-900">¥{(user?.balance ?? 50.00).toFixed(2)}</p>
          </div>
          <button onClick={() => navigate('/user/account')} className="btn-primary text-sm py-1.5">充值</button>
        </div>
      </div>

      <div className="card">
        {menus.map(({ icon: Icon, label, to }) => (
          <button key={label} onClick={() => navigate(to)} className="flex items-center gap-3 w-full py-3 first:pt-0 last:pb-0 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 -mx-4 px-4">
            <Icon className="w-5 h-5 text-zinc-400" />
            <span className="flex-1 text-sm text-zinc-700 text-left">{label}</span>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </button>
        ))}
      </div>

      <button onClick={() => { logout(); navigate('/login') }} className="w-full mt-6 py-2.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" />退出登录
      </button>
    </div>
  )
}
