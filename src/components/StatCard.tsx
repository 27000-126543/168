import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: number
  className?: string
  dark?: boolean
}

export default function StatCard({ icon, label, value, trend, className = '', dark = false }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${dark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100 shadow-sm'} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</span>
        <div className={`${dark ? 'text-brand-400' : 'text-brand-600'}`}>{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`number-font text-2xl font-bold ${dark ? 'text-white' : 'text-zinc-900'}`}>{value}</span>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
