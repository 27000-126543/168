import { useState, useEffect } from 'react'
import { Clock, MapPin, DollarSign, Bike, ChevronDown, ChevronUp } from 'lucide-react'
import { useRideStore } from '@/stores/rideStore'
import type { RideOrder } from '@/types'

const MOCK_HISTORY: RideOrder[] = [
  { id: '1', userId: 'u1', vehicleId: 'v1', startTime: '2026-06-08 14:30', endTime: '2026-06-08 15:10', startLat: 39.9, startLng: 116.4, endLat: 39.92, endLng: 116.42, distance: 3.5, duration: 40, fee: 5.5, dispatchFee: 0, creditDeducted: 0, inFence: true, status: 'completed' },
  { id: '2', userId: 'u1', vehicleId: 'v2', startTime: '2026-06-07 09:15', endTime: '2026-06-07 09:45', startLat: 39.91, startLng: 116.39, endLat: 39.93, endLng: 116.41, distance: 2.8, duration: 30, fee: 4.0, dispatchFee: 5, creditDeducted: 5, inFence: false, status: 'completed' },
  { id: '3', userId: 'u1', vehicleId: 'v3', startTime: '2026-06-05 18:00', endTime: '2026-06-05 18:25', startLat: 39.9, startLng: 116.4, endLat: 39.91, endLng: 116.43, distance: 2.1, duration: 25, fee: 3.5, dispatchFee: 0, creditDeducted: 0, inFence: true, status: 'completed' },
]

function RideCard({ order }: { order: RideOrder }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Bike className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">{order.startTime}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock className="w-3 h-3" />{order.duration}分钟</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400"><MapPin className="w-3 h-3" />{order.distance}km</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="number-font font-bold text-zinc-900">¥{order.fee.toFixed(2)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">车辆编号</span><span className="number-font">{order.vehicleId}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">骑行时长</span><span>{order.duration}分钟</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">骑行距离</span><span>{order.distance}km</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">骑行费用</span><span className="number-font">¥{order.fee.toFixed(2)}</span></div>
          {order.dispatchFee > 0 && <div className="flex justify-between"><span className="text-red-500">调度费</span><span className="number-font text-red-500">¥{order.dispatchFee.toFixed(2)}</span></div>}
          {order.creditDeducted > 0 && <div className="flex justify-between"><span className="text-red-500">扣除信用分</span><span className="number-font text-red-500">-{order.creditDeducted}</span></div>}
          <div className="flex justify-between"><span className="text-zinc-400">围栏内还车</span><span className={order.inFence ? 'text-green-600' : 'text-red-500'}>{order.inFence ? '是' : '否'}</span></div>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const { rideHistory, fetchHistory } = useRideStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchHistory().finally(() => setLoaded(true))
  }, [fetchHistory])

  const history = rideHistory.length > 0 ? rideHistory : (loaded ? MOCK_HISTORY : [])

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-zinc-900 mb-4">骑行记录</h1>
      {history.length === 0 ? (
        <div className="text-center py-16">
          <Bike className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">暂无骑行记录</p>
        </div>
      ) : (
        history.map((order) => <RideCard key={order.id} order={order} />)
      )}
    </div>
  )
}
