import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, DollarSign, Wrench, TrendingUp, AlertTriangle, Clock, ArrowRight, Calendar, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '@/utils/api'

interface DashboardData {
  month: string
  revenue: number
  dispatchRevenue: number
  opsCost: number
  arrearsAmount: number
  profit: number
  rideCount: number
  overtimeTaskCount: number
  pendingTaskCount: number
  areaBreakdown: {
    areaId: string
    areaName: string
    revenue: number
    dispatchRevenue: number
    opsCost: number
    arrearsAmount: number
    profit: number
  }[]
  overtimeTasks: {
    id: string
    type: string
    vehicleCode: string
    vehicleAreaId: string
    createdAt: string
  }[]
}

const AREA_MAP: Record<string, string> = {
  area1: '朝阳区', area2: '海淀区', area3: '西城区', area4: '东城区', area5: '丰台区',
}

const typeLabels: Record<string, string> = {
  battery_swap: '换电', repair: '维修', dispatch: '调度',
}

export default function Overview() {
  const navigate = useNavigate()
  const [month, setMonth] = useState('2026-06')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDashboard = async (m: string) => {
    setLoading(true)
    try {
      const res = await api.get<DashboardData>(`/reports/dashboard?month=${m}`)
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard(month) }, [])

  const handleMonthChange = (m: string) => {
    setMonth(m)
    fetchDashboard(m)
  }

  const chartData = data?.areaBreakdown.map(a => ({
    area: a.areaName,
    骑行收入: a.revenue,
    调度费: a.dispatchRevenue,
    运维成本: a.opsCost,
    欠费: a.arrearsAmount,
    利润: a.profit >= 0 ? a.profit : 0,
  })) || []

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">经营看板</h1>
        <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <input type="month" value={month} onChange={(e) => handleMonthChange(e.target.value)} className="bg-transparent text-sm outline-none" />
        </div>
      </div>

      {loading && <p className="text-zinc-400 text-sm">加载中...</p>}

      {data && (
        <>
          <div className="grid grid-cols-6 gap-3 mb-6">
            <div className="stat-card">
              <p className="text-xs text-zinc-500 mb-1">骑行量</p>
              <p className="number-font text-xl font-bold text-zinc-900">{data.rideCount.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-zinc-500 mb-1">骑行收入</p>
              <p className="number-font text-xl font-bold text-brand-700">¥{data.revenue.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-zinc-500 mb-1">调度费</p>
              <p className="number-font text-xl font-bold text-teal-600">¥{data.dispatchRevenue.toLocaleString()}</p>
            </div>
            <div className="stat-card cursor-pointer hover:ring-2 hover:ring-accent-300" onClick={() => navigate('/admin/reports')}>
              <p className="text-xs text-zinc-500 mb-1">运维成本</p>
              <p className="number-font text-xl font-bold text-accent-600">¥{data.opsCost.toLocaleString()}</p>
              <ChevronRight className="w-3 h-3 text-zinc-400 absolute top-2 right-2" />
            </div>
            <div className={`stat-card cursor-pointer hover:ring-2 ${data.arrearsAmount > 0 ? 'hover:ring-red-300' : 'hover:ring-zinc-300'}`} onClick={() => navigate('/admin/users')}>
              <p className="text-xs text-zinc-500 mb-1">欠费金额</p>
              <p className={`number-font text-xl font-bold ${data.arrearsAmount > 0 ? 'text-red-600' : 'text-zinc-900'}`}>¥{data.arrearsAmount.toLocaleString()}</p>
              {data.arrearsAmount > 0 && <AlertTriangle className="w-3 h-3 text-red-500 absolute top-2 right-2" />}
            </div>
            <div className="stat-card">
              <p className="text-xs text-zinc-500 mb-1">利润</p>
              <p className={`number-font text-xl font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{data.profit.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`stat-card flex items-center gap-3 cursor-pointer hover:ring-2 ${data.overtimeTaskCount > 0 ? 'hover:ring-red-300 bg-red-50/50' : 'hover:ring-zinc-300'}`} onClick={() => navigate('/admin/reports')}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.overtimeTaskCount > 0 ? 'bg-red-100' : 'bg-zinc-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${data.overtimeTaskCount > 0 ? 'text-red-600' : 'text-zinc-400'}`} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">超时任务</p>
                <p className={`number-font text-xl font-bold ${data.overtimeTaskCount > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{data.overtimeTaskCount}</p>
              </div>
              {data.overtimeTaskCount > 0 && <span className="ml-auto px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">需关注</span>}
            </div>
            <div className="stat-card flex items-center gap-3 cursor-pointer hover:ring-2 hover:ring-zinc-300" onClick={() => navigate('/admin/users')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-50">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">待处理任务</p>
                <p className="number-font text-xl font-bold text-yellow-600">{data.pendingTaskCount}</p>
              </div>
            </div>
          </div>

          <div className="card mb-6">
            <h2 className="font-bold text-zinc-900 mb-4">各区域收支对比</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="骑行收入" fill="#0F766E" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="调度费" fill="#14b8a6" />
                  <Bar dataKey="运维成本" fill="#f59e0b" />
                  <Bar dataKey="欠费" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-zinc-300 text-sm">暂无数据</div>
            )}
          </div>

          {data.overtimeTaskCount > 0 && (
            <div className="card mb-6">
              <h2 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />超时任务
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 text-xs border-b border-zinc-100">
                    <th className="text-left py-2">车辆编号</th>
                    <th className="text-left py-2">任务类型</th>
                    <th className="text-left py-2">区域</th>
                    <th className="text-left py-2">创建时间</th>
                    <th className="text-right py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overtimeTasks.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-50">
                      <td className="py-2.5 text-zinc-700 font-medium">{t.vehicleCode}</td>
                      <td className="py-2.5 text-zinc-600">{typeLabels[t.type] || t.type}</td>
                      <td className="py-2.5 text-zinc-600">{AREA_MAP[t.vehicleAreaId] || t.vehicleAreaId}</td>
                      <td className="py-2.5 text-zinc-400 number-font text-xs">{new Date(t.createdAt).toLocaleString('zh-CN')}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => navigate('/admin/reports')} className="text-xs text-brand-700 hover:underline flex items-center gap-1 ml-auto">
                          查看详情 <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-bold text-zinc-900 mb-4">快捷入口</h2>
              <div className="space-y-2">
                {[
                  { label: '运营报告', to: '/admin/reports', icon: Bike },
                  { label: '计价规则', to: '/admin/pricing', icon: DollarSign },
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
            <div className="card">
              <h2 className="font-bold text-zinc-900 mb-4">区域利润排名</h2>
              <div className="space-y-2">
                {[...data.areaBreakdown]
                  .sort((a, b) => b.profit - a.profit)
                  .map((a, i) => (
                    <div key={a.areaId} className="flex items-center gap-3 text-sm">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-500'}`}>{i + 1}</span>
                      <span className="flex-1 text-zinc-700">{a.areaName}</span>
                      <span className={`number-font font-medium ${a.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{a.profit.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="card text-center py-16">
          <TrendingUp className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 mb-2">选择月份查看经营数据</p>
          <p className="text-zinc-300 text-xs">需先生成对应月份的运营报告</p>
        </div>
      )}
    </div>
  )
}
