import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const homeMap: Record<UserRole, string> = {
      user: '/user',
      ops: '/ops',
      supervisor: '/supervisor',
      admin: '/admin',
    }
    return <Navigate to={homeMap[role]} replace />
  }

  return <>{children}</>
}
