import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet'
import { Navigation, MapPin, Battery } from 'lucide-react'
import { useOpsStore } from '@/stores/opsStore'
import BatteryBar from '@/components/BatteryBar'

const MOCK_WAYPOINTS = [
  { vehicleId: 'v1', lat: 39.905, lng: 116.405, order: 1, battery: 12, vehicleCode: 'EB-0012', address: '朝阳区国贸CBD' },
  { vehicleId: 'v2', lat: 39.908, lng: 116.415, order: 2, battery: 8, vehicleCode: 'EB-0034', address: '朝阳区三里屯' },
  { vehicleId: 'v3', lat: 39.912, lng: 116.420, order: 3, battery: 15, vehicleCode: 'EB-0056', address: '朝阳区工体北路' },
  { vehicleId: 'v4', lat: 39.915, lng: 116.425, order: 4, battery: 5, vehicleCode: 'EB-0078', address: '东城区东直门' },
]

export default function RouteView() {
  const { currentRoute, fetchRoute } = useOpsStore()

  useEffect(() => { fetchRoute() }, [fetchRoute])

  const waypoints = currentRoute?.waypoints?.length ? currentRoute.waypoints : MOCK_WAYPOINTS
  const positions: [number, number][] = waypoints.map((w) => [w.lat, w.lng])

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-zinc-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 mb-1">换电路线</h2>
          <p className="text-xs text-zinc-400">预计 {currentRoute?.estimatedTime || 45} 分钟 · {currentRoute?.totalDistance || 5.2}km</p>
        </div>
        <div className="flex-1 p-4 space-y-0">
          {waypoints.map((wp, i) => (
            <div key={wp.vehicleId} className={`flex items-start gap-3 pb-4 ${i < waypoints.length - 1 ? 'border-l-2 border-brand-200 ml-4 pl-4' : 'ml-4 pl-4'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold -ml-7 ${i === 0 ? 'bg-brand-700 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                {wp.order}
              </div>
              <div className="flex-1 min-w-0">
                <p className="number-font text-sm font-bold text-zinc-900">{wp.vehicleCode || wp.vehicleId}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{wp.address || '未知地址'}</p>
                {wp.battery !== undefined && <BatteryBar level={wp.battery} />}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-100">
          <button className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
            <Navigation className="w-4 h-4" />开始路线
          </button>
        </div>
      </div>
      <div className="flex-1">
        <MapContainer center={[39.909, 116.415]} zoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polyline positions={positions} pathOptions={{ color: '#0F766E', weight: 3, dashArray: '8,6' }} />
          {waypoints.map((wp, i) => (
            <CircleMarker key={wp.vehicleId} center={[wp.lat, wp.lng]} radius={10} pathOptions={{ color: i === 0 ? '#0F766E' : '#71717a', fillColor: i === 0 ? '#0F766E' : '#a1a1aa', fillOpacity: 0.8, weight: 2 }} />
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
