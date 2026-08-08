import type { Role } from '@/config/roles'
import type { BadgeProps } from '@/components/ui/badge'

/** Derive up-to-two-letter initials from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Map a role to a Badge visual variant. */
export function roleBadgeVariant(role: Role): BadgeProps['variant'] {
  switch (role) {
    case 'admin':
      return 'default'
    case 'moderator':
      return 'secondary'
    case 'member':
      return 'outline'
    default:
      return 'outline'
  }
}
