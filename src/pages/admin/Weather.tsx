import { useState, useEffect } from 'react'
import { Sun, Cloud, CloudRain, CloudDrizzle, Snowflake, Save } from 'lucide-react'
import { usePricingStore } from '@/stores/pricingStore'
import type { WeatherAdjustment } from '@/types'

const WEATHER_CONDITIONS = [
  { condition: '晴天', icon: Sun, color: 'text-yellow-500 bg-yellow-50' },
  { condition: '多云', icon: Cloud, color: 'text-zinc-500 bg-zinc-50' },
  { condition: '小雨', icon: CloudDrizzle, color: 'text-blue-500 bg-blue-50' },
  { condition: '大雨', icon: CloudRain, color: 'text-blue-700 bg-blue-50' },
  { condition: '雪', icon: Snowflake, color: 'text-cyan-500 bg-cyan-50' },
]

const MOCK_CONFIG: WeatherAdjustment[] = [
  { condition: '晴天', multiplier: 1.0 },
  { condition: '多云', multiplier: 1.0 },
  { condition: '小雨', multiplier: 1.2 },
  { condition: '大雨', multiplier: 1.5 },
  { condition: '雪', multiplier: 1.8 },
]

export default function Weather() {
  const { weatherConfig, fetchWeather, updateWeather, loading } = usePricingStore()
  const [config, setConfig] = useState<WeatherAdjustment[]>(MOCK_CONFIG)
  const [currentWeather] = useState('晴天')

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  useEffect(() => {
    if (weatherConfig.length > 0) setConfig(weatherConfig)
  }, [weatherConfig])

  const updateMultiplier = (condition: string, multiplier: number) => {
    setConfig((prev) => prev.map((c) => (c.condition === condition ? { ...c, multiplier } : c)))
  }

  const handleSave = async () => {
    await updateWeather(config)
  }

  const basePrice = 2.0

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">天气调价配置</h1>

      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center">
            <Sun className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">当前天气</p>
            <p className="text-xl font-bold text-zinc-900">{currentWeather}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-zinc-400">当前倍率</p>
            <p className="number-font text-xl font-bold text-brand-700">1.0x</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {WEATHER_CONDITIONS.map(({ condition, icon: Icon, color }) => {
          const item = config.find((c) => c.condition === condition)
          const multiplier = item?.multiplier || 1.0
          return (
            <div key={condition} className="card">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-zinc-900 mb-1">{condition}</p>
                  <input type="range" min={0.5} max={2.0} step={0.1} value={multiplier} onChange={(e) => updateMultiplier(condition, Number(e.target.value))} className="w-full accent-brand-700" />
                  <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                    <span>0.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
                <div className="text-right w-20">
                  <p className="number-font text-lg font-bold text-zinc-900">{multiplier.toFixed(1)}x</p>
                  <p className="text-xs text-zinc-400">¥{(basePrice * multiplier).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card mb-6">
        <h3 className="font-bold text-zinc-900 mb-3">调价预览</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 text-xs border-b border-zinc-100">
              <th className="text-left py-2">天气</th>
              <th className="text-center py-2">倍率</th>
              <th className="text-center py-2">起步价</th>
              <th className="text-center py-2">时长费</th>
              <th className="text-center py-2">里程费</th>
            </tr>
          </thead>
          <tbody>
            {config.map((item) => (
              <tr key={item.condition} className="border-b border-zinc-50">
                <td className="py-2 text-zinc-700">{item.condition}</td>
                <td className="text-center py-2 number-font font-medium">{item.multiplier.toFixed(1)}x</td>
                <td className="text-center py-2 number-font">¥{(2.0 * item.multiplier).toFixed(2)}</td>
                <td className="text-center py-2 number-font">¥{(1.0 * item.multiplier).toFixed(2)}</td>
                <td className="text-center py-2 number-font">¥{(0.5 * item.multiplier).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
        <Save className="w-4 h-4" />保存配置
      </button>
    </div>
  )
}
