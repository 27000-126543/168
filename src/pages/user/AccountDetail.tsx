import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import { Wallet, Plus, Bike, AlertTriangle, Shield, ArrowDownUp, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  relatedId: string | null
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

export default function AccountDetail() {
  const { user, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [arrears, setArrears] = useState<ArrearsInfo | null>(null)
  const [showTopup, setShowTopup] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [txRes, arRes] = await Promise.all([
        api.get<Transaction[]>('/transactions'),
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
  }, [])

  const handleTopupSuccess = async () => {
    await Promise.all([fetchMe(), fetchData()])
  }

  const handleTransactionClick = (tx: Transaction) => {
    if (tx.relatedId) {
      navigate('/user/history')
    }
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
          <button onClick={() => setShowTopup(true)} className="btn-primary text-sm py-1.5 flex items-center gap-1">
            <Plus className="w-4 h-4" />充值
          </button>
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
            const clickable = !!tx.relatedId

            return (
              <div
                key={tx.id}
                onClick={() => handleTransactionClick(tx)}
                className={`card flex items-center gap-3 ${clickable ? 'cursor-pointer hover:bg-zinc-50 active:bg-zinc-100' : ''}`}
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
                {clickable && <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />}
              </div>
            )
          })}
        </div>
      )}

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} onSuccess={handleTopupSuccess} />}
    </div>
  )
}
