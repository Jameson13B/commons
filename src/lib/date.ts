import type { Timestamp } from 'firebase/firestore'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
]

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/**
 * Turn a Firestore timestamp into a friendly relative string like "3h ago".
 * Returns "just now" for very recent times and an empty string for null
 * (e.g. a pending serverTimestamp that hasn't resolved yet).
 */
export function formatRelative(ts: Timestamp | null | undefined): string {
  if (!ts) return 'just now'
  const then = ts.toDate().getTime()
  const seconds = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(seconds)

  if (abs < 45) return 'just now'

  for (const [unit, secondsInUnit] of UNITS) {
    if (abs >= secondsInUnit) {
      return rtf.format(Math.round(seconds / secondsInUnit), unit)
    }
  }
  return 'just now'
}

/** Full, absolute date+time for tooltips / hover titles. */
export function formatAbsolute(ts: Timestamp | null | undefined): string {
  if (!ts) return ''
  return ts.toDate().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

/** Short month abbreviation, e.g. "AUG", for a compact date badge. */
export function monthAbbrev(date: Date): string {
  return date
    .toLocaleString(undefined, { month: 'short' })
    .toUpperCase()
}

/** Full day label, e.g. "Sat, August 15, 2026". */
export function formatDay(ts: Timestamp | null | undefined): string {
  if (!ts) return 'Date TBD'
  return dayFmt.format(ts.toDate())
}

/**
 * A human time range for an event, e.g. "6:00 PM – 8:00 PM" or just
 * "6:00 PM" when there's no end time.
 */
export function formatTimeRange(
  start: Timestamp | null | undefined,
  end: Timestamp | null | undefined,
): string {
  if (!start) return ''
  const startLabel = timeFmt.format(start.toDate())
  if (!end) return startLabel
  return `${startLabel} \u2013 ${timeFmt.format(end.toDate())}`
}

/**
 * Convert a Date into the `YYYY-MM-DDTHH:mm` string expected by a
 * `<input type="datetime-local">`, in the browser's local time zone.
 */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Whether an event's start time is in the past (defaults to false if unset). */
export function isPast(start: Timestamp | null | undefined): boolean {
  if (!start) return false
  return start.toDate().getTime() < Date.now()
}
