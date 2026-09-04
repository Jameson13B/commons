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

/** How a member responded to an event invitation. */
export type RsvpStatus = 'going' | 'maybe' | 'not_going'

/**
 * A member's RSVP stored at `events/{eventId}/rsvps/{uid}`.
 * Document ID matches the member's auth uid.
 */
export interface EventRsvp {
  id: string
  uid: string
  displayName: string
  status: RsvpStatus
  updatedAt: Timestamp | null
}

/** The kinds of official records the community keeps. */
export type RecordType = 'paper' | 'vote' | 'policy'

/** Records are drafted privately, then published to all members. */
export type RecordStatus = 'draft' | 'published'

/** The recorded result of a community vote. */
export type VoteOutcome = 'passed' | 'failed' | 'tabled'

/**
 * An official community record stored at `records/{id}` -- a paper, a recorded
 * vote/decision, or a policy. Managed by admins; published records are visible
 * to all active members.
 */
export interface CommunityRecord {
  id: string
  type: RecordType
  title: string
  /** Optional human reference, e.g. "R-2026-014". */
  referenceNumber: string
  /** Short one-line description shown in the list. */
  summary: string
  /** Full record content. */
  body: string
  status: RecordStatus
  /** The official date of the record/decision (may differ from createdAt). */
  recordDate: Timestamp | null
  // Vote-only fields (null for other record types).
  voteOutcome: VoteOutcome | null
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
  authorUid: string
  authorName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  publishedAt: Timestamp | null
}

/**
 * A member's upcoming trip away from Commons, stored at `consularTrips/{id}`.
 * Self-service: any active member can post their own trips; owners manage
 * their own entries, moderators can remove any.
 */
export interface ConsularTrip {
  id: string
  /** Trip destination. */
  place: string
  notes: string
  startAt: Timestamp | null
  endAt: Timestamp | null
  createdBy: string
  createdByName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/**
 * A community-contributed travel tip stored at `travelTips/{id}`. Self-service:
 * any active member can post; owners manage their own, moderators can remove any.
 */
export interface TravelTip {
  id: string
  destination: string
  tip: string
  authorUid: string
  authorName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/** Lifecycle of a guest visa application: pending review, approved, or denied. */
export type VisaStatus = 'pending' | 'approved' | 'denied'

/**
 * A guest visa application for a visitor coming to Commons, stored at
 * `guestVisas/{id}`. Any active member can submit one for review; only
 * admins can approve or deny it. The submitter (while still pending) or an
 * admin can withdraw it.
 */
export interface GuestVisaApplication {
  id: string
  guestName: string
  /** Where the guest is traveling from. */
  origin: string
  purpose: string
  startAt: Timestamp | null
  endAt: Timestamp | null
  status: VisaStatus
  submittedBy: string
  submittedByName: string
  reviewedBy: string | null
  reviewedByName: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
