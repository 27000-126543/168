import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { Search, QrCode, CreditCard, Zap, X } from 'lucide-react'
import { useVehicleStore } from '@/stores/vehicleStore'
import { useRideStore } from '@/stores/rideStore'
import { useAuthStore } from '@/stores/authStore'
import VehicleMarker from '@/components/VehicleMarker'
import BatteryBar from '@/components/BatteryBar'
import { useNavigate } from 'react-router-dom'

const MOCK_VEHICLES = [
  { id: '1', code: 'EB-0012', lat: 39.905, lng: 116.405, battery: 85, status: 'available' as const, areaId: 'a1', lastReportTime: '' },
  { id: '2', code: 'EB-0034', lat: 39.908, lng: 116.412, battery: 42, status: 'low_battery' as const, areaId: 'a1', lastReportTime: '' },
  { id: '3', code: 'EB-0056', lat: 39.902, lng: 116.398, battery: 91, status: 'available' as const, areaId: 'a1', lastReportTime: '' },
  { id: '4', code: 'EB-0078', lat: 39.911, lng: 116.420, battery: 10, status: 'fault' as const, areaId: 'a1', lastReportTime: '' },
  { id: '5', code: 'EB-0090', lat: 39.897, lng: 116.395, battery: 73, status: 'available' as const, areaId: 'a1', lastReportTime: '' },
]

function CreditDialog({ creditScore, onUnlock, onClose }: { creditScore: number; onUnlock: (paidDeposit: boolean) => void; onClose: () => void }) {
  const isGreen = creditScore >= 80
  const isYellow = creditScore >= 60 && creditScore < 80
  const isRed = creditScore < 60

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">信用分检查</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${isGreen ? 'bg-green-100' : isYellow ? 'bg-yellow-100' : 'bg-red-100'}`}>
            <span className={`number-font text-2xl font-bold ${isGreen ? 'text-green-600' : isYellow ? 'text-yellow-600' : 'text-red-600'}`}>{creditScore}</span>
          </div>
          <p className="text-sm text-zinc-500">当前信用分</p>
        </div>
        {isGreen && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">信用分良好，可直接开锁骑行</div>
        )}
        {isYellow && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">信用分偏低，请文明骑行避免扣分</div>
        )}
        {isRed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">信用分不足，需缴纳押金后方可骑行</div>
        )}
        {isRed ? (
          <button onClick={() => onUnlock(true)} className="w-full btn-accent py-2.5 flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" />缴纳押金 ¥199 并开锁
          </button>
        ) : (
          <button onClick={() => onUnlock(false)} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />立即开锁
          </button>
        )}
      </div>
    </div>
  )
}

export default function UserHome() {
  const { nearbyVehicles, recommended, fetchNearby } = useVehicleStore()
  const { unlock } = useRideStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [showScan, setShowScan] = useState(false)
  const [showCredit, setShowCredit] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    fetchNearby(39.9, 116.4, 3)
  }, [fetchNearby])

  const vehicles = nearbyVehicles.length > 0 ? nearbyVehicles : MOCK_VEHICLES
  const rec = recommended || vehicles[0]

  const handleScan = () => {
    setShowScan(true)
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      setShowScan(false)
      setShowCredit(true)
    }, 2000)
  }

  const handleUnlock = async (paidDeposit: boolean) => {
    try {
      await unlock(rec?.id || '1', paidDeposit)
      setShowCredit(false)
      navigate('/user/riding')
    } catch {}
  }

  const creditScore = user?.creditScore ?? 100

  return (
    <div className="h-full relative">
      <MapContainer center={[39.9, 116.4]} zoom={15} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {vehicles.map((v) => (
          <VehicleMarker key={v.id} position={[v.lat, v.lng]} battery={v.battery} status={v.status} code={v.code} />
        ))}
      </MapContainer>

      <div className="absolute top-14 left-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg px-3 py-2.5">
          <Search className="w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="搜索附近车辆" className="flex-1 text-sm bg-transparent outline-none" />
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${creditScore >= 80 ? 'bg-green-100 text-green-700' : creditScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            <CreditCard className="w-3 h-3" />
            <span className="number-font">{creditScore}</span>
          </div>
        </div>
      </div>

      {rec && (
        <div className="absolute bottom-4 left-4 right-16 z-10 animate-slide-up">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">推荐车辆</span>
              <span className="text-xs text-zinc-400">距离 50m</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-brand-700">{rec.code}</p>
                <BatteryBar level={rec.battery} />
              </div>
              <button onClick={handleScan} className="btn-primary text-sm py-1.5 px-4">扫码用车</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={handleScan} className="absolute bottom-4 right-4 z-10 w-12 h-12 bg-brand-700 rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform">
        <QrCode className="w-6 h-6" />
      </button>

      {showScan && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-brand-400 rounded-2xl relative">
            {scanning && <div className="absolute left-2 right-2 h-0.5 bg-brand-400 animate-bounce" style={{ animationDuration: '1.5s' }} />}
          </div>
          <p className="absolute bottom-1/3 text-white text-sm">正在扫描...</p>
          <button onClick={() => { setShowScan(false); setScanning(false) }} className="absolute top-6 right-6 text-white"><X className="w-6 h-6" /></button>
        </div>
      )}

      {showCredit && <CreditDialog creditScore={creditScore} onUnlock={handleUnlock} onClose={() => setShowCredit(false)} />}
    </div>
  )
}
