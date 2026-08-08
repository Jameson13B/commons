import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast, ROLE_LABELS, type Role } from '@/config/roles'

/**
 * Gate for routes that require a minimum role. Assumes it renders inside a
 * RequireAuth boundary (so a profile is guaranteed to exist).
 */
export function RequireRole({ minRole }: { minRole: Role }) {
  const { profile } = useAuth()

  if (!hasAtLeast(profile?.role, minRole)) {
    return <Navigate to="/" replace state={{ deniedRole: ROLE_LABELS[minRole] }} />
  }

  return <Outlet />
}
