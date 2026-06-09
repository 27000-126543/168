import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import UserHome from '@/pages/user/UserHome'
import Riding from '@/pages/user/Riding'
import History from '@/pages/user/History'
import Report from '@/pages/user/Report'
import Profile from '@/pages/user/Profile'
import TaskList from '@/pages/ops/TaskList'
import RouteView from '@/pages/ops/RouteView'
import ScanConfirm from '@/pages/ops/ScanConfirm'
import Dashboard from '@/pages/supervisor/Dashboard'
import Dispatch from '@/pages/supervisor/Dispatch'
import Overview from '@/pages/admin/Overview'
import Pricing from '@/pages/admin/Pricing'
import Weather from '@/pages/admin/Weather'
import Reports from '@/pages/admin/Reports'
import Users from '@/pages/admin/Users'
import Notifications from '@/pages/Notifications'

function HomeRedirect() {
  const { isAuthenticated, role } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const homeMap: Record<string, string> = { user: '/user', ops: '/ops', supervisor: '/supervisor', admin: '/admin' }
  return <Navigate to={homeMap[role || 'user']} replace />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<ProtectedRoute allowedRoles={['user']}><Layout role="user" /></ProtectedRoute>}>
          <Route path="/user" element={<UserHome />} />
          <Route path="/user/riding" element={<Riding />} />
          <Route path="/user/history" element={<History />} />
          <Route path="/user/report" element={<Report />} />
          <Route path="/user/profile" element={<Profile />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ops']}><Layout role="ops" /></ProtectedRoute>}>
          <Route path="/ops" element={<TaskList />} />
          <Route path="/ops/route" element={<RouteView />} />
          <Route path="/ops/scan" element={<ScanConfirm />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['supervisor']}><Layout role="supervisor" /></ProtectedRoute>}>
          <Route path="/supervisor" element={<Dashboard />} />
          <Route path="/supervisor/dispatch" element={<Dispatch />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']}><Layout role="admin" /></ProtectedRoute>}>
          <Route path="/admin" element={<Overview />} />
          <Route path="/admin/pricing" element={<Pricing />} />
          <Route path="/admin/weather" element={<Weather />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/users" element={<Users />} />
        </Route>

        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      </Routes>
    </Router>
  )
}
