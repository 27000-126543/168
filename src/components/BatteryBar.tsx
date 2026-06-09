export default function BatteryBar({ level, showLabel = true }: { level: number; showLabel?: boolean }) {
  const color = level > 60 ? 'bg-green-500' : level > 20 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-3 bg-zinc-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(0, Math.min(100, level))}%` }} />
      </div>
      {showLabel && <span className="number-font text-xs text-zinc-500">{level}%</span>}
    </div>
  )
}
