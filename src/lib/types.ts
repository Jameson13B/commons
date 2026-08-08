import type { Timestamp } from 'firebase/firestore'
import type { AccountStatus, Role } from '@/config/roles'

/** A member profile stored at `users/{uid}` in Firestore. */
export interface UserProfile {
  uid: string
  phoneNumber: string | null
  displayName: string
  role: Role
  status: AccountStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/** A community announcement stored at `announcements/{id}`. */
export interface Announcement {
  id: string
  title: string
  body: string
  authorUid: string
  authorName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/**
 * A scheduled community event stored at `events/{id}`.
 * (Named `CommunityEvent` to avoid clashing with the DOM `Event` type.)
 */
export interface CommunityEvent {
  id: string
  title: string
  description: string
  location: string
  startAt: Timestamp | null
  /** Optional end time. Null means no explicit end. */
  endAt: Timestamp | null
  createdBy: string
  createdByName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
