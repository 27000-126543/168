import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { VehicleStatus } from '@/types'

const statusColors: Record<VehicleStatus, string> = {
  available: '#22c55e',
  riding: '#3b82f6',
  low_battery: '#f59e0b',
  maintenance: '#eab308',
  fault: '#ef4444',
}

interface VehicleMarkerProps {
  position: [number, number]
  battery: number
  status: VehicleStatus
  code: string
  onClick?: () => void
}

export default function VehicleMarker({ position, battery, status, code, onClick }: VehicleMarkerProps) {
  const color = statusColors[status]
  const isAvailable = status === 'available'
  const size = 36

  const icon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;cursor:pointer" ${onClick ? 'onclick="this.dataset.clicked=true"' : ''}>
        ${isAvailable ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color}33;animation:pulse-glow 2s infinite"></div>` : ''}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
          <span style="color:white;font-size:11px;font-weight:bold;font-family:'JetBrains Mono',monospace">${battery}%</span>
        </div>
        <div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(0,0,0,0.75);color:white;padding:1px 6px;border-radius:4px;font-size:10px">${code}</div>
      </div>
    `,
    iconSize: [size, size + 20],
    iconAnchor: [size / 2, size / 2],
  })

  return <Marker position={position} icon={icon} eventHandlers={{ click: onClick }} />
}
