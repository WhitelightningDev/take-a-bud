import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { AppHeader } from './AppHeader.tsx'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, user, profile } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Wait for the profile fetch to complete. Without this, admins can get redirected
  // to /store briefly while their profile is still loading.
  if (!profile) {
    return (
      <div className="appPage">
        <AppHeader />
        <main className="appMain">
          <p className="appHint">Checking admin access…</p>
        </main>
      </div>
    )
  }

  if (!profile?.is_admin) {
    return (
      <div className="appPage">
        <AppHeader />
        <main className="appMain">
          <div className="notice notice--warn">
            <p className="notice__title">Admin access required</p>
            <p className="notice__body">
              You’re signed in, but this account does not have admin permissions.
            </p>
          </div>
          <Link className="primaryButton" to="/store">
            Back to store
          </Link>
        </main>
      </div>
    )
  }

  return children
}
