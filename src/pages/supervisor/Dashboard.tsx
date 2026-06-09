import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { Bike, Zap, Activity, AlertTriangle, MapPinned } from 'lucide-react'
import { useStatsStore } from '@/stores/statsStore'
import StatCard from '@/components/StatCard'
import type { HeatmapType } from '@/types'

const MOCK_HEATMAP = [
  { lat: 39.905, lng: 116.405, intensity: 0.9, type: 'vehicle_density' as const },
  { lat: 39.908, lng: 116.412, intensity: 0.6, type: 'vehicle_density' as const },
  { lat: 39.902, lng: 116.398, intensity: 0.3, type: 'vehicle_density' as const },
  { lat: 39.911, lng: 116.420, intensity: 0.8, type: 'vehicle_density' as const },
  { lat: 39.897, lng: 116.395, intensity: 0.5, type: 'vehicle_density' as const },
  { lat: 39.914, lng: 116.425, intensity: 0.7, type: 'vehicle_density' as const },
]

const MOCK_AREA_STATS = [
  { areaId: '1', areaName: '朝阳区', vehicleCount: 320, availableCount: 210, turnoverRate: 3.8, faultRate: 2.1, rideCount: 1200, revenue: 5600, opsCost: 1200 },
  { areaId: '2', areaName: '海淀区', vehicleCount: 280, availableCount: 180, turnoverRate: 3.2, faultRate: 3.5, rideCount: 980, revenue: 4500, opsCost: 1400 },
  { areaId: '3', areaName: '东城区', vehicleCount: 200, availableCount: 150, turnoverRate: 4.1, faultRate: 1.8, rideCount: 850, revenue: 3800, opsCost: 900 },
  { areaId: '4', areaName: '西城区', vehicleCount: 180, availableCount: 120, turnoverRate: 2.9, faultRate: 4.2, rideCount: 720, revenue: 3200, opsCost: 1600 },
]

const heatmapTabs: { key: HeatmapType; label: string }[] = [
  { key: 'vehicle_density', label: '车辆密度' },
  { key: 'turnover', label: '周转率' },
  { key: 'fault', label: '故障率' },
]

function getIntensityColor(intensity: number): string {
  if (intensity > 0.7) return '#ef4444'
  if (intensity > 0.4) return '#f59e0b'
  return '#22c55e'
}

export default function Dashboard() {
  const { heatmapData, fetchHeatmap, fetchDashboard, dashboardSummary } = useStatsStore()
  const [activeTab, setActiveTab] = useState<HeatmapType>('vehicle_density')

  useEffect(() => {
    fetchDashboard()
    fetchHeatmap(activeTab)
  }, [fetchDashboard, fetchHeatmap, activeTab])

  const data = heatmapData.length > 0 ? heatmapData : MOCK_HEATMAP
  const summary = dashboardSummary || { totalVehicles: 980, availableVehicles: 660, avgTurnoverRate: 3.5, faultRate: 2.9 }

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-auto">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Bike className="w-5 h-5" />} label="总车辆数" value={summary.totalVehicles} dark />
        <StatCard icon={<Zap className="w-5 h-5" />} label="可用车辆" value={summary.availableVehicles} trend={5.2} dark />
        <StatCard icon={<Activity className="w-5 h-5" />} label="平均周转率" value={`${summary.avgTurnoverRate}`} dark />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="故障率" value={`${summary.faultRate}%`} trend={-1.5} dark />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 rounded-xl border border-zinc-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
            <span className="text-sm text-zinc-300 flex items-center gap-2"><MapPinned className="w-4 h-4" />热力图</span>
            <div className="flex gap-1">
              {heatmapTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1 rounded-lg text-xs ${activeTab === tab.key ? 'bg-brand-700 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <MapContainer center={[39.907, 116.410]} zoom={13} className="h-[300px] w-full" zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {data.map((point, i) => (
              <CircleMarker key={i} center={[point.lat, point.lng]} radius={20 + point.intensity * 30} pathOptions={{ color: getIntensityColor(point.intensity), fillColor: getIntensityColor(point.intensity), fillOpacity: 0.4, weight: 1 }} />
            ))}
          </MapContainer>
        </div>

        <div className="w-96 rounded-xl border border-zinc-700 bg-zinc-800 overflow-auto">
          <div className="px-4 py-2 border-b border-zinc-700">
            <span className="text-sm text-zinc-300">区域对比</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 text-xs border-b border-zinc-700">
                <th className="text-left px-4 py-2">区域</th>
                <th className="text-right px-3 py-2">周转率</th>
                <th className="text-right px-3 py-2">故障率</th>
                <th className="text-right px-4 py-2">车辆</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AREA_STATS.map((area) => (
                <tr key={area.areaId} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                  <td className="px-4 py-2.5 text-zinc-200">{area.areaName}</td>
                  <td className="text-right px-3 py-2.5 number-font text-zinc-300">{area.turnoverRate}</td>
                  <td className={`text-right px-3 py-2.5 number-font ${area.faultRate > 3 ? 'text-red-400' : 'text-zinc-300'}`}>{area.faultRate}%</td>
                  <td className="text-right px-4 py-2.5 number-font text-zinc-300">{area.vehicleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
