import type { CommunityEvent } from '@/lib/types'

/** Escape text for iCalendar property values (RFC 5545). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Format a Date as a UTC iCalendar timestamp, e.g. 20260815T180000Z. */
function toIcsUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** Build a filename-safe slug from an event title. */
function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return slug || 'event'
}

/**
 * Build a standards-compatible .ics calendar file for a community event.
 * Opening/downloading this file lets the device's calendar app import it.
 */
export function buildEventIcs(event: CommunityEvent): string {
  if (!event.startAt) {
    throw new Error('Event is missing a start time.')
  }

  const start = event.startAt.toDate()
  // Default to a 1-hour block when no end time is set so calendar apps
  // still get a usable duration.
  const end = event.endAt?.toDate() ?? new Date(start.getTime() + 60 * 60 * 1000)
  const now = new Date()
  const uid = `${event.id}@commons.events`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Commons//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ]

  if (event.description.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description.trim())}`)
  }
  if (event.location.trim()) {
    lines.push(`LOCATION:${escapeIcsText(event.location.trim())}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

/** Trigger a browser download of the event as an .ics calendar file. */
export function downloadEventIcs(event: CommunityEvent): void {
  const ics = buildEventIcs(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${slugify(event.title)}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
