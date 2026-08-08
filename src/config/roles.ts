/**
 * Authorization model.
 *
 * Roles are tiered and compared numerically so permission checks are trivial:
 * a user "has at least" a role if their tier is >= the required tier.
 */

export const ROLES = ['guest', 'member', 'moderator', 'admin'] as const
export type Role = (typeof ROLES)[number]

/** Numeric rank for each role. Higher = more privileged. */
export const ROLE_RANK: Record<Role, number> = {
  guest: 0,
  member: 1,
  moderator: 2,
  admin: 3,
}

/** Account lifecycle status. New sign-ups start as `pending`. */
export type AccountStatus = 'pending' | 'active' | 'suspended'

/** Human-friendly labels for display in the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  guest: 'Guest',
  member: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
}

export const STATUS_LABELS: Record<AccountStatus, string> = {
  pending: 'Pending approval',
  active: 'Active',
  suspended: 'Suspended',
}

/** Returns true when `role` meets or exceeds the `min` required role. */
export function hasAtLeast(role: Role | undefined | null, min: Role): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** The role assigned to brand-new accounts. */
export const DEFAULT_ROLE: Role = 'guest'
export const DEFAULT_STATUS: AccountStatus = 'pending'
