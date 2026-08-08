import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { FullPageSpinner } from '@/components/ui/spinner'

/**
 * Gate for authenticated routes. Redirects to /login when signed out and to
 * /onboarding when signed in without a profile yet.
 */
export function RequireAuth() {
  const { user, profile, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || (user && profileLoading)) {
    return <FullPageSpinner label="Loading your workspace..." />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
