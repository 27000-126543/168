import { useState, useEffect } from 'react'
import { Download, Calendar, RefreshCw, BarChart3, ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useReportStore } from '@/stores/reportStore'

const PIE_COLORS = ['#0F766E', '#14b8a6', '#2dd4bf', '#99f6e4']

export default function Reports() {
  const { monthlyReports, areaDetail, fetchMonthly, generateReport, fetchAreaDetail, clearAreaDetail, loading } = useReportStore()
  const [selectedMonth, setSelectedMonth] = useState('2026-06')
  const [generating, setGenerating] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)

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
    if (selectedAreaId) {
      fetchAreaDetail(selectedAreaId)
    }
  }

  const handleAreaClick = (areaId: string) => {
    setSelectedAreaId(areaId)
    fetchAreaDetail(areaId)
  }

  const handleBackFromDetail = () => {
    setSelectedAreaId(null)
    clearAreaDetail()
  }

  const currentReport = monthlyReports.find((r) => r.month === selectedMonth)
  const allRidesData = monthlyReports.map((r) => ({ month: r.month, rides: r.totalRides, revenue: r.totalRevenue, profit: r.totalProfit }))

  const areaRevenueData = currentReport
    ? currentReport.areas.map((a) => ({ area: a.areaName, revenue: a.revenue, dispatchRevenue: a.dispatchRevenue }))
    : []

  const areaDetailData = currentReport ? currentReport.areas : []

  const costPieData = currentReport
    ? [
        { name: '换电成本', value: currentReport.totalBatterySwapCost, color: PIE_COLORS[0] },
        { name: '维修成本', value: currentReport.totalRepairCost, color: PIE_COLORS[1] },
        { name: '调度成本', value: Math.round(currentReport.totalOpsCost * 0.1), color: PIE_COLORS[2] },
        { name: '其他', value: Math.max(0, currentReport.totalOpsCost - currentReport.totalBatterySwapCost - currentReport.totalRepairCost - Math.round(currentReport.totalOpsCost * 0.1)), color: PIE_COLORS[3] },
      ]
    : []

  const downloadReport = () => {
    if (!currentReport) return
    const lines = [
      `=== ${selectedMonth} 月度运营报告 ===`,
      '',
      '汇总数据:',
      `  总骑行量: ${currentReport.totalRides}`,
      `  骑行收入: ¥${currentReport.totalRevenue.toFixed(2)}`,
      `  调度费收入: ¥${currentReport.totalDispatchRevenue.toFixed(2)}`,
      `  换电成本: ¥${currentReport.totalBatterySwapCost.toFixed(2)}`,
      `  维修成本: ¥${currentReport.totalRepairCost.toFixed(2)}`,
      `  欠费金额: ¥${currentReport.totalArrearsAmount.toFixed(2)}`,
      `  总运维成本: ¥${currentReport.totalOpsCost.toFixed(2)}`,
      `  总利润: ¥${currentReport.totalProfit.toFixed(2)}`,
      '',
      '各区域明细:',
    ]
    for (const a of currentReport.areas) {
      lines.push(`  ${a.areaName}: 骑行量${a.rideCount}, 骑行收入¥${a.revenue.toFixed(2)}, 调度费¥${a.dispatchRevenue.toFixed(2)}, 换电¥${a.batterySwapCost.toFixed(2)}, 维修¥${a.repairCost.toFixed(2)}, 欠费¥${a.arrearsAmount.toFixed(2)}, 利润¥${a.profit.toFixed(2)}`)
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

  if (selectedAreaId && areaDetail) {
    return <AreaDetailView areaDetail={areaDetail} onBack={handleBackFromDetail} />
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
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">总骑行量</p>
            <p className="number-font text-2xl font-bold text-zinc-900">{currentReport.totalRides.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">骑行收入</p>
            <p className="number-font text-2xl font-bold text-brand-700">¥{currentReport.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">调度费收入</p>
            <p className="number-font text-2xl font-bold text-teal-600">¥{currentReport.totalDispatchRevenue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">运维成本</p>
            <p className="number-font text-2xl font-bold text-accent-600">¥{currentReport.totalOpsCost.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">利润</p>
            <p className={`number-font text-2xl font-bold ${currentReport.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{currentReport.totalProfit.toLocaleString()}</p>
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
          <h3 className="font-bold text-zinc-900 mb-4">各区域收入构成</h3>
          {areaRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="骑行收入" fill="#0F766E" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="dispatchRevenue" name="调度费" fill="#14b8a6" radius={[0, 0, 0, 0]} stackId="a" />
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
          <h3 className="font-bold text-zinc-900 mb-4">区域详情 <span className="text-xs text-zinc-400 font-normal ml-2">点击区域查看月度趋势</span></h3>
          {areaDetailData.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 text-xs border-b border-zinc-100">
                  <th className="text-left py-2">区域</th>
                  <th className="text-right py-2">骑行量</th>
                  <th className="text-right py-2">骑行收入</th>
                  <th className="text-right py-2">调度费</th>
                  <th className="text-right py-2">运维成本</th>
                  <th className="text-right py-2">欠费</th>
                  <th className="text-right py-2">利润</th>
                </tr>
              </thead>
              <tbody>
                {areaDetailData.map((row) => (
                  <tr key={row.areaId} onClick={() => handleAreaClick(row.areaId)} className="border-b border-zinc-50 cursor-pointer hover:bg-zinc-50 transition-colors">
                    <td className="py-2.5 text-zinc-700 font-medium">{row.areaName}</td>
                    <td className="text-right py-2.5 number-font">{row.rideCount.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font">¥{row.revenue.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font text-teal-600">¥{row.dispatchRevenue.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font text-accent-600">¥{row.opsCost.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font text-red-500">¥{row.arrearsAmount.toLocaleString()}</td>
                    <td className="text-right py-2.5 number-font font-medium">
                      <span className={row.profit >= 0 ? 'text-green-600' : 'text-red-600'}>¥{row.profit.toLocaleString()}</span>
                    </td>
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

function AreaDetailView({ areaDetail, onBack }: { areaDetail: import('@/types').AreaDetailReport; onBack: () => void }) {
  const chartData = [...areaDetail.reports].sort((a, b) => a.month.localeCompare(b.month))

  const latestReport = areaDetail.reports[0]

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{areaDetail.areaName} - 运营详情</h1>
          <p className="text-sm text-zinc-400">各月运营数据趋势</p>
        </div>
      </div>

      {latestReport && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">骑行量</p>
            <p className="number-font text-2xl font-bold text-zinc-900">{latestReport.rideCount.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">骑行收入</p>
            <p className="number-font text-2xl font-bold text-brand-700">¥{latestReport.revenue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">调度费收入</p>
            <p className="number-font text-2xl font-bold text-teal-600">¥{latestReport.dispatchRevenue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">运维成本</p>
            <p className="number-font text-2xl font-bold text-accent-600">¥{latestReport.opsCost.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-zinc-500 mb-1">利润</p>
            <p className={`number-font text-2xl font-bold ${latestReport.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{latestReport.profit.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />收入趋势
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="骑行收入" fill="#0F766E" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="dispatchRevenue" name="调度费收入" fill="#14b8a6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-300 text-sm">暂无数据</div>
          )}
        </div>
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-accent-600" />成本趋势
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="batterySwapCost" name="换电成本" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="repairCost" name="维修成本" fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-300 text-sm">暂无数据</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">利润趋势</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="profit" name="利润" stroke="#0F766E" strokeWidth={2} dot={{ fill: '#0F766E' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-300 text-sm">暂无数据</div>
          )}
        </div>
        <div className="card">
          <h3 className="font-bold text-zinc-900 mb-4">欠费趋势</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="arrearsAmount" name="欠费金额" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-300 text-sm">暂无数据</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-zinc-900 mb-4">月度数据明细</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 text-xs border-b border-zinc-100">
              <th className="text-left py-2">月份</th>
              <th className="text-right py-2">骑行量</th>
              <th className="text-right py-2">骑行收入</th>
              <th className="text-right py-2">调度费</th>
              <th className="text-right py-2">换电成本</th>
              <th className="text-right py-2">维修成本</th>
              <th className="text-right py-2">欠费</th>
              <th className="text-right py-2">利润</th>
            </tr>
          </thead>
          <tbody>
            {areaDetail.reports.map((row) => (
              <tr key={row.month} className="border-b border-zinc-50">
                <td className="py-2.5 text-zinc-700 font-medium">{row.month}</td>
                <td className="text-right py-2.5 number-font">{row.rideCount.toLocaleString()}</td>
                <td className="text-right py-2.5 number-font">¥{row.revenue.toLocaleString()}</td>
                <td className="text-right py-2.5 number-font text-teal-600">¥{row.dispatchRevenue.toLocaleString()}</td>
                <td className="text-right py-2.5 number-font text-yellow-600">¥{row.batterySwapCost.toLocaleString()}</td>
                <td className="text-right py-2.5 number-font text-red-500">¥{row.repairCost.toLocaleString()}</td>
                <td className="text-right py-2.5 number-font text-red-500">¥{row.arrearsAmount.toLocaleString()}</td>
                <td className="text-right py-2.5 number-font font-medium">
                  <span className={row.profit >= 0 ? 'text-green-600' : 'text-red-600'}>¥{row.profit.toLocaleString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
