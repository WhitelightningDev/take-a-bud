import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

