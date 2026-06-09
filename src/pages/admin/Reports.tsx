import { useState, useEffect } from 'react'
import { Download, Calendar } from 'lucide-react'
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useReportStore } from '@/stores/reportStore'

const MOCK_RIDES = [
  { month: '1月', rides: 9800, revenue: 52000 },
  { month: '2月', rides: 8500, revenue: 45000 },
  { month: '3月', rides: 11200, revenue: 61000 },
  { month: '4月', rides: 10800, revenue: 58000 },
  { month: '5月', rides: 12500, revenue: 67000 },
  { month: '6月', rides: 12580, revenue: 68420 },
]

const MOCK_AREA_REVENUE = [
  { area: '朝阳区', revenue: 22000 },
  { area: '海淀区', revenue: 18000 },
  { area: '东城区', revenue: 15000 },
  { area: '西城区', revenue: 13420 },
]

const MOCK_COST_PIE = [
  { name: '换电成本', value: 5000, color: '#0F766E' },
  { name: '维修成本', value: 3500, color: '#14b8a6' },
  { name: '调度成本', value: 2350, color: '#2dd4bf' },
  { name: '其他', value: 1500, color: '#99f6e4' },
]

const MOCK_AREA_DETAIL = [
  { areaName: '朝阳区', rideCount: 4200, revenue: 22000, opsCost: 5000, profit: 17000 },
  { areaName: '海淀区', rideCount: 3500, revenue: 18000, opsCost: 4800, profit: 13200 },
  { areaName: '东城区', rideCount: 2800, revenue: 15000, opsCost: 3200, profit: 11800 },
  { areaName: '西城区', rideCount: 2080, revenue: 13420, opsCost: 4350, profit: 9070 },
]

const PIE_COLORS = ['#0F766E', '#14b8a6', '#2dd4bf', '#99f6e4']

export default function Reports() {
  const { monthlyReports, fetchMonthly, loading } = useReportStore()
  const [selectedMonth, setSelectedMonth] = useState('2026-06')

  useEffect(() => { fetchMonthly() }, [fetchMonthly])

  const ridesData = monthlyReports.length > 0
    ? monthlyReports.map((r) => ({ month: r.month, rides: r.totalRides, revenue: r.totalRevenue }))
    : MOCK_RIDES

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">运营报告</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm outline-none" />
          </div>
          <button className="btn-outline flex items-center gap-2"><Download className="w-4 h-4" />下载报告</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">月度骑行量趋势</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ridesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rides" stroke="#0F766E" strokeWidth={2} dot={{ fill: '#0F766E' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">各区域收入</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MOCK_AREA_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="area" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#0F766E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">成本构成</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={MOCK_COST_PIE} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {MOCK_COST_PIE.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 card">
          <h3 className="font-bold text-zinc-900 mb-4">区域详情</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 text-xs border-b border-zinc-100">
                <th className="text-left py-2">区域</th>
                <th className="text-right py-2">骑行量</th>
                <th className="text-right py-2">收入</th>
                <th className="text-right py-2">运维成本</th>
                <th className="text-right py-2">利润</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AREA_DETAIL.map((row) => (
                <tr key={row.areaName} className="border-b border-zinc-50">
                  <td className="py-2.5 text-zinc-700">{row.areaName}</td>
                  <td className="text-right py-2.5 number-font">{row.rideCount.toLocaleString()}</td>
                  <td className="text-right py-2.5 number-font">¥{row.revenue.toLocaleString()}</td>
                  <td className="text-right py-2.5 number-font text-accent-600">¥{row.opsCost.toLocaleString()}</td>
                  <td className="text-right py-2.5 number-font text-brand-700 font-medium">¥{row.profit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
