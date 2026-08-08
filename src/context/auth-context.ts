import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '@/lib/types'

export interface AuthContextValue {
  /** The raw Firebase auth user, or null when signed out. */
  user: User | null
  /** The Firestore profile for the signed-in user, or null if none yet. */
  profile: UserProfile | null
  /** True while the initial auth state is being resolved. */
  loading: boolean
  /** True while the profile document is being loaded for a signed-in user. */
  profileLoading: boolean
  /** Create the profile document for a new user with the given display name. */
  createProfile: (displayName: string) => Promise<void>
  /** Update the signed-in user's display name. */
  updateDisplayName: (displayName: string) => Promise<void>
  /** Sign the current user out. */
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
