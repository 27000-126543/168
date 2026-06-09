import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Bell, Bike, MapPin, User, Wrench, Route, ScanLine, BarChart3, Truck, LayoutDashboard, DollarSign, CloudSun, FileText, Users, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { UserRole } from '@/types'

const roleLabels: Record<UserRole, string> = {
  user: '用户',
  ops: '运维',
  supervisor: '主管',
  admin: '管理员',
}

function UserLayout() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const tabs = [
    { to: '/user', icon: MapPin, label: '首页' },
    { to: '/user/riding', icon: Bike, label: '骑行' },
    { to: '/user/profile', icon: User, label: '我的' },
  ]
  return (
    <div className="h-screen flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-brand-700" />
          <span className="font-display font-bold text-zinc-900">智行单车</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/notifications" className="relative">
            <Bell className="w-5 h-5 text-zinc-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </NavLink>
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-2.5 py-1 text-xs">
            <span className="text-zinc-600">{user?.name}</span>
            <span className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full text-[10px]">{roleLabels[user?.role || 'user']}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 relative">
        <Outlet />
      </main>
      <nav className="bg-white border-t border-zinc-200 flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-4 py-1 ${isActive ? 'text-brand-700' : 'text-zinc-400'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function OpsLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const links = [
    { to: '/ops', icon: Wrench, label: '任务' },
    { to: '/ops/route', icon: Route, label: '路线' },
    { to: '/ops/scan', icon: ScanLine, label: '扫码' },
  ]
  return (
    <div className="h-screen flex">
      <aside className="w-16 bg-zinc-900 flex flex-col items-center py-4 gap-6">
        <Bike className="w-6 h-6 text-brand-400 mb-4" />
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 px-2 py-2 rounded-lg ${isActive ? 'bg-zinc-800 text-brand-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col items-center gap-3">
          <NavLink to="/notifications" className="relative text-zinc-500 hover:text-zinc-300">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full" />}
          </NavLink>
          <button onClick={() => { logout(); navigate('/login') }} className="text-zinc-500 hover:text-zinc-300">
            <LogOut className="w-5 h-5" />
          </button>
          <div className="text-[9px] text-zinc-600 text-center leading-tight">
            {user?.name}
            <br />
            <span className="text-brand-400">{roleLabels[user?.role || 'ops']}</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-50">
        <Outlet />
      </main>
    </div>
  )
}

function SupervisorLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const links = [
    { to: '/supervisor', icon: BarChart3, label: '大屏' },
    { to: '/supervisor/dispatch', icon: Truck, label: '调度' },
  ]
  return (
    <div className="h-screen flex flex-col bg-zinc-900">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-brand-400" />
            <span className="font-display font-bold text-white">运维监控大屏</span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-zinc-800 text-brand-400' : 'text-zinc-400 hover:text-white'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NavLink to="/notifications" className="relative text-zinc-400 hover:text-white">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full" />}
          </NavLink>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-300">{user?.name}</span>
            <span className="bg-brand-900/50 text-brand-300 px-2 py-0.5 rounded-full text-xs">{roleLabels[user?.role || 'supervisor']}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="text-zinc-500 hover:text-zinc-300">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function AdminLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const links = [
    { to: '/admin', icon: LayoutDashboard, label: '概览' },
    { to: '/admin/pricing', icon: DollarSign, label: '计价' },
    { to: '/admin/weather', icon: CloudSun, label: '天气' },
    { to: '/admin/reports', icon: FileText, label: '报告' },
    { to: '/admin/users', icon: Users, label: '用户' },
  ]
  return (
    <div className="h-screen flex">
      <aside className="w-56 bg-white border-r border-zinc-200 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-100">
          <Bike className="w-6 h-6 text-brand-700" />
          <span className="font-display font-bold text-zinc-900">管理后台</span>
        </div>
        <nav className="flex-1 py-3">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-5 py-2.5 text-sm ${isActive ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-700' : 'text-zinc-600 hover:bg-zinc-50'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">{user?.name?.[0]}</div>
            <div>
              <div className="text-zinc-800 text-xs font-medium">{user?.name}</div>
              <div className="text-[10px] text-zinc-400">{roleLabels[user?.role || 'admin']}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/notifications" className="relative text-zinc-400 hover:text-zinc-600">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full" />}
            </NavLink>
            <button onClick={() => { logout(); navigate('/login') }} className="text-zinc-400 hover:text-zinc-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-50">
        <Outlet />
      </main>
    </div>
  )
}

export default function Layout({ role }: { role: UserRole }) {
  if (role === 'user') return <UserLayout />
  if (role === 'ops') return <OpsLayout />
  if (role === 'supervisor') return <SupervisorLayout />
  return <AdminLayout />
}
