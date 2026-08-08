import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth'
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserProfile } from '@/lib/types'
import { DEFAULT_ROLE, DEFAULT_STATUS } from '@/config/roles'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'

const USERS_COLLECTION = 'users'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // Start true: until we know there's no user, assume a profile may be loading.
  // This prevents guards from evaluating against a null profile on hard loads.
  const [profileLoading, setProfileLoading] = useState(true)

  // Track the Firebase auth session.
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
      if (nextUser) {
        // A user exists; the profile subscription (below) is about to load it.
        setProfileLoading(true)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })
  }, [])

  // Subscribe to the profile document for the signed-in user (realtime, so
  // role/status changes made by an admin reflect immediately).
  useEffect(() => {
    if (!user) return
    setProfileLoading(true)
    const ref = doc(db, USERS_COLLECTION, user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
        setProfileLoading(false)
      },
      (error) => {
        console.error('[Commons] Failed to read profile:', error)
        setProfileLoading(false)
      },
    )
    return unsub
  }, [user])

  const createProfile = useCallback(
    async (displayName: string) => {
      if (!user) throw new Error('Not signed in')
      const ref = doc(db, USERS_COLLECTION, user.uid)
      await setDoc(ref, {
        uid: user.uid,
        phoneNumber: user.phoneNumber ?? null,
        displayName: displayName.trim(),
        role: DEFAULT_ROLE,
        status: DEFAULT_STATUS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) throw new Error('Not signed in')
      const ref = doc(db, USERS_COLLECTION, user.uid)
      await updateDoc(ref, {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const signOut = useCallback(async () => {
    await fbSignOut(auth)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      createProfile,
      updateDisplayName,
      signOut,
    }),
    [user, profile, loading, profileLoading, createProfile, updateDisplayName, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
