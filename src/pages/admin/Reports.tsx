import { useState, useEffect } from 'react'
import { Download, Calendar, RefreshCw, BarChart3 } from 'lucide-react'
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useReportStore } from '@/stores/reportStore'
import type { MonthlyReport } from '@/types'

const PIE_COLORS = ['#0F766E', '#14b8a6', '#2dd4bf', '#99f6e4']

export default function Reports() {
  const { monthlyReports, fetchMonthly, generateReport, loading } = useReportStore()
  const [selectedMonth, setSelectedMonth] = useState('2026-06')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { fetchMonthly() }, [fetchMonthly])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateReport(selectedMonth)
    } finally {
      setGenerating(false)
    }
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    fetchMonthly(month)
  }

  const currentReport = monthlyReports.find((r) => r.month === selectedMonth)
  const allRidesData = monthlyReports.map((r) => ({ month: r.month, rides: r.totalRides, revenue: r.totalRevenue }))

  const areaRevenueData = currentReport
    ? currentReport.areas.map((a) => ({ area: a.areaName, revenue: a.revenue }))
    : []

  const areaDetailData = currentReport ? currentReport.areas : []

  const costPieData = currentReport
    ? [
        { name: '换电成本', value: Math.round(currentReport.totalOpsCost * 0.45), color: PIE_COLORS[0] },
        { name: '维修成本', value: Math.round(currentReport.totalOpsCost * 0.3), color: PIE_COLORS[1] },
        { name: '调度成本', value: Math.round(currentReport.totalOpsCost * 0.15), color: PIE_COLORS[2] },
        { name: '其他', value: Math.round(currentReport.totalOpsCost * 0.1), color: PIE_COLORS[3] },
      ]
    : []

  const downloadReport = () => {
    if (!currentReport) return
    const lines = [
      `=== ${selectedMonth} 月度运营报告 ===`,
      '',
      '汇总数据:',
      `  总骑行量: ${currentReport.totalRides}`,
      `  总收入: ¥${currentReport.totalRevenue.toFixed(2)}`,
      `  总运维成本: ¥${currentReport.totalOpsCost.toFixed(2)}`,
      `  总利润: ¥${currentReport.totalProfit.toFixed(2)}`,
      '',
      '各区域明细:',
    ]
    for (const a of currentReport.areas) {
      lines.push(`  ${a.areaName}: 骑行量${a.rideCount}, 收入¥${a.revenue.toFixed(2)}, 运维成本¥${a.opsCost.toFixed(2)}, 利润¥${a.profit.toFixed(2)}`)
    }
    lines.push('', `生成时间: ${new Date().toLocaleString('zh-CN')}`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `运营报告_${selectedMonth}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">运营报告</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <input type="month" value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)} className="bg-transparent text-sm outline-none" />
          </div>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {generating ? '生成中...' : '生成报告'}
          </button>
          {currentReport && (
            <button onClick={downloadReport} className="btn-outline flex items-center gap-2"><Download className="w-4 h-4" />下载报告</button>
          )}
        </div>
      </div>

      {currentReport && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">总骑行量</p>
            <p className="number-font text-2xl font-bold text-zinc-900">{currentReport.totalRides.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">总收入</p>
            <p className="number-font text-2xl font-bold text-brand-700">¥{currentReport.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">运维成本</p>
            <p className="number-font text-2xl font-bold text-accent-600">¥{currentReport.totalOpsCost.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">利润</p>
            <p className="number-font text-2xl font-bold text-green-600">¥{currentReport.totalProfit.toLocaleString()}</p>
          </div>
        </div>
      )}

      {!currentReport && !loading && (
        <div className="card text-center py-16 mb-6">
          <BarChart3 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 mb-4">选择月份后点击"生成报告"查看运营数据</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">月度骑行量趋势</h3>
          {allRidesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={allRidesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rides" stroke="#0F766E" strokeWidth={2} dot={{ fill: '#0F766E' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-300 text-sm">暂无趋势数据</div>
          )}
        </div>
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">各区域收入</h3>
          {areaRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-300 text-sm">暂无区域收入数据</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">成本构成</h3>
          {costPieData.length > 0 && costPieData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={costPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {costPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-zinc-300 text-sm">暂无成本数据</div>
          )}
        </div>
        <div className="col-span-2 card">
          <h3 className="font-bold text-zinc-900 mb-4">区域详情</h3>
          {areaDetailData.length > 0 ? (
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
                {areaDetailData.map((row) => (
                  <tr key={row.areaId} className="border-b border-zinc-50">
                    <td className="py-2.5 text-zinc-700">{row.areaName}</td>
                    <td className="text-right py-2.5 number-font">{row.rideCount.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font">¥{row.revenue.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font text-accent-600">¥{row.opsCost.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font text-brand-700 font-medium">¥{row.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-zinc-300 text-sm">暂无区域详情数据</div>
          )}
        </div>
      </div>
    </div>
  )
}
