import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline } from 'react-leaflet'
import { Timer, MapPin, DollarSign, X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { useRideStore } from '@/stores/rideStore'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

const MOCK_TRACK: [number, number][] = [
  [39.905, 116.405],
  [39.906, 116.407],
  [39.907, 116.410],
  [39.908, 116.413],
  [39.909, 116.416],
]

function ReturnModal({ inFence, fee, dispatchFee, onConfirm, onClose }: { inFence: boolean; fee: number; dispatchFee: number; onConfirm: () => void; onClose: () => void }) {
  const totalFee = fee + (inFence ? 0 : dispatchFee)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">还车确认</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        {inFence ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-700">在停车围栏内</span>
            </div>
            <p className="text-sm text-green-600">可正常还车，无需额外费用</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-700">不在停车围栏内</span>
            </div>
            <p className="text-sm text-red-600">需加收调度费 ¥{dispatchFee.toFixed(2)}，并扣除信用分5分</p>
          </div>
        )}
        <div className="bg-zinc-50 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-zinc-500">骑行费用</span><span className="number-font font-medium">¥{fee.toFixed(2)}</span></div>
          {!inFence && <div className="flex justify-between text-sm"><span className="text-red-500">调度费</span><span className="number-font font-medium text-red-500">¥{dispatchFee.toFixed(2)}</span></div>}
          <div className="border-t border-zinc-200 pt-2 flex justify-between font-medium"><span>合计</span><span className="number-font text-brand-700">¥{totalFee.toFixed(2)}</span></div>
        </div>
        <button onClick={onConfirm} className="w-full btn-primary py-2.5">确认还车</button>
      </div>
    </div>
  )
}

function ReturnResultModal({ result, onClose }: { result: { fee: number; dispatchFee: number; totalFee: number; inFence: boolean; creditDeducted: number; balanceInsufficient: boolean; newBalance: number; newCreditScore: number } | null; onClose: () => void }) {
  if (!result) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-4">
          <CheckCircle className="w-12 h-12 text-brand-700 mx-auto mb-2" />
          <h3 className="font-bold text-lg">还车完成</h3>
        </div>
        <div className="bg-zinc-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">骑行费用</span><span className="number-font">¥{result.fee.toFixed(2)}</span></div>
          {result.dispatchFee > 0 && <div className="flex justify-between"><span className="text-red-500">调度费</span><span className="number-font text-red-500">¥{result.dispatchFee.toFixed(2)}</span></div>}
          <div className="border-t border-zinc-200 pt-2 flex justify-between font-medium"><span>合计扣款</span><span className="number-font text-brand-700">¥{result.totalFee.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">当前余额</span><span className="number-font">¥{result.newBalance.toFixed(2)}</span></div>
          {result.creditDeducted > 0 && <div className="flex justify-between"><span className="text-zinc-500">信用分</span><span className="number-font text-red-500">{result.newCreditScore}分（-{result.creditDeducted}）</span></div>}
        </div>
        {result.balanceInsufficient && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">余额不足，欠费¥{(result.totalFee - result.newBalance).toFixed(2)}将记入待还款，请及时充值。</p>
          </div>
        )}
        <button onClick={onClose} className="w-full btn-primary py-2.5">确定</button>
      </div>
    </div>
  )
}

export default function Riding() {
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(1.2)
  const [fee, setFee] = useState(2.5)
  const [showReturn, setShowReturn] = useState(false)
  const [inFence] = useState(true)
  const { reportPosition, currentRide, returnBike, lastReturnResult, clearReturnResult } = useRideStore()
  const { fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const reportRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1)
      setDistance((d) => +(d + 0.005).toFixed(3))
      setFee((f) => +(f + 0.01).toFixed(2))
    }, 1000)
    reportRef.current = setInterval(() => {
      const lat = 39.905 + Math.random() * 0.005
      const lng = 116.405 + Math.random() * 0.005
      if (currentRide?.id) reportPosition(currentRide.id, lat, lng)
    }, 30000)
    return () => {
      clearInterval(timerRef.current)
      clearInterval(reportRef.current)
    }
  }, [currentRide?.id, reportPosition])

  const handleReturn = async () => {
    try {
      await returnBike(currentRide?.id || '1', 39.91, 116.42)
      setShowReturn(false)
    } catch {}
  }

  const handleResultClose = async () => {
    await fetchMe()
    clearReturnResult()
    navigate('/user/history')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="h-full relative">
      <MapContainer center={[39.907, 116.410]} zoom={15} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={MOCK_TRACK} pathOptions={{ color: '#0F766E', weight: 4, opacity: 0.8 }} />
      </MapContainer>

      <div className="absolute bottom-6 left-4 right-4 z-10">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <Timer className="w-5 h-5 text-brand-700 mx-auto mb-1" />
              <p className="number-font text-xl font-bold text-zinc-900">{formatTime(duration)}</p>
              <p className="text-xs text-zinc-400">时长</p>
            </div>
            <div className="text-center">
              <MapPin className="w-5 h-5 text-brand-700 mx-auto mb-1" />
              <p className="number-font text-xl font-bold text-zinc-900">{distance.toFixed(1)}km</p>
              <p className="text-xs text-zinc-400">距离</p>
            </div>
            <div className="text-center">
              <DollarSign className="w-5 h-5 text-accent-500 mx-auto mb-1" />
              <p className="number-font text-xl font-bold text-zinc-900">¥{fee.toFixed(2)}</p>
              <p className="text-xs text-zinc-400">费用</p>
            </div>
          </div>
          <button onClick={() => setShowReturn(true)} className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition-all active:scale-95">
            还车
          </button>
        </div>
      </div>

      {showReturn && <ReturnModal inFence={inFence} fee={fee} dispatchFee={5} onConfirm={handleReturn} onClose={() => setShowReturn(false)} />}
      {lastReturnResult && <ReturnResultModal result={lastReturnResult} onClose={handleResultClose} />}
    </div>
  )
}
