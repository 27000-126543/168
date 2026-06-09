import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import { Wallet, Plus, Bike, AlertTriangle, Shield, ArrowDownUp, ChevronRight, X, Download, Calendar } from 'lucide-react'

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  relatedId: string | null
  vehicleCode: string | null
  description: string
  status: string
  createdAt: string
}

interface ArrearsInfo {
  totalArrears: number
  count: number
  items: Transaction[]
}

interface TopupResult {
  newBalance: number
  settledArrears: number
  topupAmount: number
}

const TYPE_CONFIG: Record<string, { icon: typeof Bike; label: string; color: string; bg: string }> = {
  ride_fee: { icon: Bike, label: '骑行扣费', color: 'text-red-500', bg: 'bg-red-50' },
  dispatch_fee: { icon: AlertTriangle, label: '调度费', color: 'text-orange-500', bg: 'bg-orange-50' },
  deposit_pay: { icon: Shield, label: '押金缴纳', color: 'text-blue-500', bg: 'bg-blue-50' },
  deposit_refund: { icon: Shield, label: '押金退还', color: 'text-green-500', bg: 'bg-green-50' },
  topup: { icon: Plus, label: '充值', color: 'text-green-500', bg: 'bg-green-50' },
  arrears: { icon: AlertTriangle, label: '欠费', color: 'text-red-500', bg: 'bg-red-50' },
}

const TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '骑行扣费', value: 'ride_fee' },
  { label: '调度费', value: 'dispatch_fee' },
  { label: '押金', value: 'deposit_pay' },
  { label: '充值', value: 'topup' },
  { label: '欠费', value: 'arrears' },
]

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '已完成', value: 'completed' },
  { label: '欠费中', value: 'arrears' },
]

const PRESET_AMOUNTS = [20, 50, 100]

function TopupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const val = typeof amount === 'number' ? amount : Number(amount)
    if (!val || val <= 0) {
      setError('请输入有效金额')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post<TopupResult>('/transactions/topup', { amount: val })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message || '充值失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-zinc-900">充值</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => { setAmount(preset); setError('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                amount === preset
                  ? 'bg-brand-50 text-brand-700 border-2 border-brand-700'
                  : 'bg-zinc-50 text-zinc-600 border-2 border-transparent'
              }`}
            >
              ¥{preset}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value === '' ? '' : Number(e.target.value)); setError('') }}
            placeholder="输入充值金额"
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 number-font"
          />
        </div>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting || !amount}
          className="w-full btn-primary py-2.5 disabled:opacity-50"
        >
          {submitting ? '充值中...' : '确认充值'}
        </button>
      </div>
    </div>
  )
}

function TransactionDetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const config = TYPE_CONFIG[tx.type] || { icon: Wallet, label: tx.type, color: 'text-zinc-500', bg: 'bg-zinc-50' }
  const Icon = config.icon
  const isPositive = tx.amount > 0
  const isCompleted = tx.status === 'completed'
  const isArrears = tx.status === 'arrears'

  const parseDeductAmount = () => {
    const match = tx.description.match(/抵扣[欠费]?[：:]?\s*¥?([\d.]+)/)
    return match ? match[1] : null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-zinc-900">交易详情</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <p className="font-medium text-zinc-900">{config.label}</p>
            <p className="text-sm text-zinc-400 mt-0.5">{tx.description || config.label}</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">金额</span>
            <span className={`number-font text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}¥{tx.amount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">交易后余额</span>
            <span className="number-font text-sm text-zinc-900">¥{tx.balanceAfter.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">状态</span>
            {isCompleted && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600">已完成</span>
            )}
            {isArrears && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">欠费中</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">时间</span>
            <span className="text-sm text-zinc-900">{new Date(tx.createdAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-3 space-y-2">
          {tx.relatedId && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">关联订单</span>
              <span className="text-sm text-zinc-900">{tx.relatedId}</span>
            </div>
          )}
          {tx.vehicleCode && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">车辆编号</span>
              <span className="text-sm text-zinc-900">{tx.vehicleCode}</span>
            </div>
          )}
          {tx.type === 'ride_fee' && tx.relatedId && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">费用组成</span>
              <span className="text-sm text-zinc-900">骑行费</span>
            </div>
          )}
          {tx.type === 'dispatch_fee' && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">费用组成</span>
              <span className="text-sm text-zinc-900">围栏外还车调度费</span>
            </div>
          )}
          {tx.type === 'topup' && tx.description.includes('抵扣') && (() => {
            const deductAmount = parseDeductAmount()
            return deductAmount ? (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">抵扣欠费</span>
                <span className="text-sm text-red-500">¥{deductAmount}</span>
              </div>
            ) : null
          })()}
          {tx.type === 'deposit_pay' && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">押金金额</span>
              <span className="text-sm text-zinc-900">¥199</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountDetail() {
  const { user, fetchMe } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [arrears, setArrears] = useState<ArrearsInfo | null>(null)
  const [showTopup, setShowTopup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      if (filterMonth) params.set('month', filterMonth)
      const qs = params.toString()
      const [txRes, arRes] = await Promise.all([
        api.get<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`),
        api.get<ArrearsInfo>('/transactions/arrears'),
      ])
      setTransactions(txRes)
      setArrears(arRes)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterType, filterStatus, filterMonth])

  const handleTopupSuccess = async () => {
    await Promise.all([fetchMe(), fetchData()])
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      if (filterMonth) params.set('month', filterMonth)
      const qs = params.toString()
      const data = await api.get<Transaction[]>(`/transactions/export${qs ? `?${qs}` : ''}`)
      const lines = [
        '=== 对账单 ===',
        '',
        ...data.map((tx) => {
          const config = TYPE_CONFIG[tx.type] || { label: tx.type }
          const sign = tx.amount > 0 ? '+' : ''
          return `[${new Date(tx.createdAt).toLocaleString('zh-CN')}] ${config.label} | ${tx.description || config.label} | ${sign}¥${tx.amount.toFixed(2)} | 余额¥${tx.balanceAfter.toFixed(2)} | ${tx.status === 'completed' ? '已完成' : '欠费中'}${tx.relatedId ? ` | 订单:${tx.relatedId}` : ''}${tx.vehicleCode ? ` | 车辆:${tx.vehicleCode}` : ''}`
        }),
        '',
        `共计 ${data.length} 笔交易`,
        `生成时间: ${new Date().toLocaleString('zh-CN')}`,
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `对账单_${filterMonth || '全部'}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const balance = user?.balance ?? 0
  const hasArrears = arrears && arrears.totalArrears > 0

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-brand-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-zinc-500">当前余额</p>
            <p className="number-font text-2xl font-bold text-zinc-900">¥{balance.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-outline text-sm py-1.5 flex items-center gap-1">
              <Download className="w-4 h-4" />导出对账单
            </button>
            <button onClick={() => setShowTopup(true)} className="btn-primary text-sm py-1.5 flex items-center gap-1">
              <Plus className="w-4 h-4" />充值
            </button>
          </div>
        </div>
        {hasArrears && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700">欠费 <span className="number-font font-bold">¥{arrears.totalArrears.toFixed(2)}</span></p>
              <p className="text-xs text-red-500">{arrears.count}笔未结清</p>
            </div>
            <button onClick={() => setShowTopup(true)} className="text-sm font-medium text-red-600 hover:text-red-700">去还款</button>
          </div>
        )}
      </div>

      <div className="card mb-4 space-y-3">
        <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1"
          />
          {filterMonth && (
            <button onClick={() => setFilterMonth('')} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-1.5">类型</p>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filterType === opt.value
                    ? 'bg-brand-700 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-1.5">状态</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filterStatus === opt.value
                    ? 'bg-brand-700 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-1.5">
        <ArrowDownUp className="w-4 h-4" />交易记录
      </h2>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-sm">加载中...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">暂无交易记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const config = TYPE_CONFIG[tx.type] || { icon: Wallet, label: tx.type, color: 'text-zinc-500', bg: 'bg-zinc-50' }
            const Icon = config.icon
            const isPositive = tx.amount > 0
            const isCompleted = tx.status === 'completed'
            const isArrears = tx.status === 'arrears'

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="card flex items-center gap-3 cursor-pointer hover:bg-zinc-50 active:bg-zinc-100"
              >
                <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">{tx.description || config.label}</p>
                    {isCompleted && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600">已完成</span>
                    )}
                    {isArrears && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">欠费中</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{new Date(tx.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`number-font text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}¥{tx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 number-font">余额 ¥{tx.balanceAfter.toFixed(2)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} onSuccess={handleTopupSuccess} />}
      {selectedTx && <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  )
}
