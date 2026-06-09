import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Wrench, Monitor, Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

const roles: { key: UserRole; label: string; icon: typeof Bike }[] = [
  { key: 'user', label: '用户', icon: Bike },
  { key: 'ops', label: '运维', icon: Wrench },
  { key: 'supervisor', label: '主管', icon: Monitor },
  { key: 'admin', label: '管理员', icon: Shield },
]

const defaultHints: Record<UserRole, string> = {
  user: '用户: 手机号 13800000001 验证码 123456',
  ops: '运维: ops1 / ops123',
  supervisor: '主管: supervisor / super123',
  admin: '管理员: root / admin123',
}

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('user')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, loginWithPassword } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (selectedRole === 'user') {
        await login(phone, code, selectedRole)
      } else {
        await loginWithPassword(username, password, selectedRole)
      }
      const homeMap: Record<UserRole, string> = { user: '/user', ops: '/ops', supervisor: '/supervisor', admin: '/admin' }
      navigate(homeMap[selectedRole])
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-16 right-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 right-20 w-32 h-32 bg-accent-500/10 rounded-full" />
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Bike className="w-14 h-14 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4">电单车智能运维平台</h1>
          <p className="text-brand-200 text-lg max-w-md">城市共享电单车全生命周期管理，智能调度、高效运维</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Bike className="w-8 h-8 text-brand-700" />
            <span className="font-display text-xl font-bold text-zinc-900">电单车智能运维平台</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-6">登录</h2>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {roles.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => { setSelectedRole(key); setError('') }} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm transition-all ${selectedRole === key ? 'bg-brand-50 text-brand-700 border-2 border-brand-700' : 'bg-zinc-50 text-zinc-500 border-2 border-transparent hover:bg-zinc-100'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedRole === 'user' ? (
                <>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1.5">手机号</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1.5">验证码</label>
                    <div className="flex gap-2">
                      <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="请输入验证码" className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
                      <button type="button" className="px-4 py-2.5 text-sm text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50 whitespace-nowrap">获取验证码</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1.5">用户名</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1.5">密码</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
              </button>
            </form>

            <p className="text-xs text-zinc-400 mt-4 text-center">{defaultHints[selectedRole]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
