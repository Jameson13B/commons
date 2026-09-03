import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  HelpCircle,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast } from '@/config/roles'
import type { CommunityEvent, EventRsvp, RsvpStatus } from '@/lib/types'
import {
  formatDay,
  formatTimeRange,
  isPast,
  monthAbbrev,
  toDateTimeLocalValue,
} from '@/lib/date'
import { downloadEventIcs } from '@/lib/ics'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const EVENTS_COLLECTION = 'events'
const TITLE_MAX = 140
const LOCATION_MAX = 200
const DESC_MAX = 5000

const RSVP_OPTIONS: {
  status: RsvpStatus
  label: string
  icon: typeof Check
}[] = [
  { status: 'going', label: 'Going', icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'not_going', label: "Can't go", icon: X },
]

const RSVP_STATUS_LABEL: Record<RsvpStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: "Can't go",
}

export function Events() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canManage = hasAtLeast(profile?.role, 'moderator')

  useEffect(() => {
    const q = query(collection(db, EVENTS_COLLECTION), orderBy('startAt', 'asc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as CommunityEvent,
        )
        setItems(rows)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load events. Check your access level.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const { upcoming, past } = useMemo(() => {
    const up: CommunityEvent[] = []
    const pa: CommunityEvent[] = []
    for (const ev of items) {
      if (isPast(ev.startAt)) pa.push(ev)
      else up.push(ev)
    }
    // Past events read best most-recent-first.
    pa.reverse()
    return { upcoming: up, past: pa }
  }, [items])

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Events &amp; Calendar
          </h1>
          <p className="mt-1 text-muted-foreground">
            Upcoming gatherings, meetings, and shared scheduling. RSVP and add
            events to your calendar.
          </p>
        </div>
        {canManage ? (
          <EventFormDialog
            mode="create"
            authorName={profile?.displayName ?? 'Unknown'}
            authorUid={user?.uid ?? ''}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Spinner /> Loading events...
        </div>
      ) : error ? (
        <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <CalendarDays className="size-6 text-muted-foreground" />
          <p className="font-medium">No events scheduled</p>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? 'Schedule the first gathering to fill the calendar.'
              : 'Check back soon for upcoming events.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No upcoming events right now.
              </Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} event={ev} canManage={canManage} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    canManage={canManage}
                    dimmed
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

function EventCard({
  event,
  canManage,
  dimmed,
}: {
  event: CommunityEvent
  canManage: boolean
  dimmed?: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const start = event.startAt?.toDate() ?? null
  const past = Boolean(dimmed)

  async function handleDelete() {
    setDeleting(true)
    try {
      // Clean up RSVP docs before removing the event so we don't leave orphans.
      const rsvpsSnap = await getDocs(
        collection(db, EVENTS_COLLECTION, event.id, 'rsvps'),
      )
      const batch = writeBatch(db)
      for (const rsvpDoc of rsvpsSnap.docs) {
        batch.delete(rsvpDoc.ref)
      }
      batch.delete(doc(db, EVENTS_COLLECTION, event.id))
      await batch.commit()
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Card
      className={`flex gap-4 p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:p-5 ${
        dimmed ? 'opacity-70' : ''
      }`}
    >
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-secondary/50 text-center leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {start ? monthAbbrev(start) : '—'}
        </span>
        <span className="mt-0.5 text-xl font-semibold tabular-nums">
          {start ? start.getDate() : '?'}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-semibold leading-tight">{event.title}</h3>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <EventFormDialog mode="edit" event={event} />
              <DeleteDialog
                title={event.title}
                onConfirm={handleDelete}
                deleting={deleting}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatDay(event.startAt)}
          </span>
          {event.startAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatTimeRange(event.startAt, event.endAt)}
            </span>
          ) : null}
          {event.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {event.location}
            </span>
          ) : null}
        </div>

        {event.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {event.description}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-muted-foreground">
          Organized by {event.createdByName}
        </p>

        <EventRsvpPanel event={event} readOnly={past} />
      </div>
    </Card>
  )
}

function EventRsvpPanel({
  event,
  readOnly,
}: {
  event: CommunityEvent
  readOnly?: boolean
}) {
  const { user, profile } = useAuth()
  const [rsvps, setRsvps] = useState<EventRsvp[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGuests, setShowGuests] = useState(false)

  useEffect(() => {
    const q = query(collection(db, EVENTS_COLLECTION, event.id, 'rsvps'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as EventRsvp,
        )
        setRsvps(rows)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load RSVPs.')
        setLoading(false)
      },
    )
    return unsub
  }, [event.id])

  const myRsvp = useMemo(
    () => rsvps.find((r) => r.uid === user?.uid) ?? null,
    [rsvps, user?.uid],
  )

  const counts = useMemo(() => {
    const next = { going: 0, maybe: 0, not_going: 0 }
    for (const r of rsvps) {
      next[r.status] += 1
    }
    return next
  }, [rsvps])

  const goingList = useMemo(
    () =>
      rsvps
        .filter((r) => r.status === 'going')
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [rsvps],
  )
  const maybeList = useMemo(
    () =>
      rsvps
        .filter((r) => r.status === 'maybe')
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [rsvps],
  )

  const canAddToCalendar =
    Boolean(event.startAt) &&
    (myRsvp?.status === 'going' || myRsvp?.status === 'maybe')

  async function setRsvp(status: RsvpStatus) {
    if (!user || !profile || readOnly || saving) return
    // Tapping the same status again clears the RSVP.
    if (myRsvp?.status === status) {
      setSaving(true)
      setError(null)
      try {
        await deleteDoc(doc(db, EVENTS_COLLECTION, event.id, 'rsvps', user.uid))
      } catch (err) {
        console.error(err)
        setError('Could not update your RSVP. Please try again.')
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    setError(null)
    try {
      await setDoc(doc(db, EVENTS_COLLECTION, event.id, 'rsvps', user.uid), {
        uid: user.uid,
        displayName: profile.displayName,
        status,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      setError('Could not save your RSVP. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleAddToCalendar() {
    try {
      downloadEventIcs(event)
    } catch (err) {
      console.error(err)
      setError('Could not create a calendar file for this event.')
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          RSVP
        </p>
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner className="size-3" /> Loading…
          </span>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowGuests((v) => !v)}
            aria-expanded={showGuests}
          >
            <Users className="size-3.5" />
            {counts.going} going
            {counts.maybe > 0 ? ` · ${counts.maybe} maybe` : ''}
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-1.5"
        role="group"
        aria-label="RSVP options"
      >
        {RSVP_OPTIONS.map(({ status, label, icon: Icon }) => {
          const selected = myRsvp?.status === status
          return (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              disabled={readOnly || saving || loading || !user}
              className={cn(
                'h-9 px-2 text-xs sm:text-sm',
                selected && status === 'not_going' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
              onClick={() => void setRsvp(status)}
              aria-pressed={selected}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          )
        })}
      </div>

      {readOnly ? (
        <p className="text-xs text-muted-foreground">
          This event has already passed.
        </p>
      ) : myRsvp ? (
        <p className="text-xs text-muted-foreground">
          You marked{' '}
          <span className="font-medium text-foreground">
            {RSVP_STATUS_LABEL[myRsvp.status]}
          </span>
          . Tap again to clear.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Let others know if you can make it.
        </p>
      )}

      {canAddToCalendar ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleAddToCalendar}
        >
          <CalendarPlus />
          Add to calendar
        </Button>
      ) : null}

      {showGuests ? (
        <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
          {goingList.length === 0 && maybeList.length === 0 ? (
            <p className="text-muted-foreground">No responses yet.</p>
          ) : (
            <div className="space-y-3">
              {goingList.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Going ({goingList.length})
                  </p>
                  <ul className="space-y-0.5">
                    {goingList.map((r) => (
                      <li key={r.id}>{r.displayName}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {maybeList.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Maybe ({maybeList.length})
                  </p>
                  <ul className="space-y-0.5">
                    {maybeList.map((r) => (
                      <li key={r.id}>{r.displayName}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

type EventFormProps =
  | { mode: 'create'; authorName: string; authorUid: string; event?: never }
  | { mode: 'edit'; event: CommunityEvent; authorName?: never; authorUid?: never }

function EventFormDialog(props: EventFormProps) {
  const isEdit = props.mode === 'edit'
  const existing = isEdit ? props.event : null

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function hydrate() {
    if (existing) {
      setTitle(existing.title)
      setDescription(existing.description ?? '')
      setLocation(existing.location ?? '')
      setStart(
        existing.startAt
          ? toDateTimeLocalValue(existing.startAt.toDate())
          : '',
      )
      setEnd(existing.endAt ? toDateTimeLocalValue(existing.endAt.toDate()) : '')
    } else {
      setTitle('')
      setDescription('')
      setLocation('')
      setStart('')
      setEnd('')
    }
    setError(null)
    setSubmitting(false)
  }

  const trimmedTitle = title.trim()
  const canSubmit = trimmedTitle.length > 0 && start !== '' && !submitting

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)

    const startDate = new Date(start)
    if (Number.isNaN(startDate.getTime())) {
      setError('Please choose a valid start date and time.')
      return
    }
    let endTs: Timestamp | null = null
    if (end) {
      const endDate = new Date(end)
      if (Number.isNaN(endDate.getTime())) {
        setError('Please choose a valid end date and time.')
        return
      }
      if (endDate.getTime() < startDate.getTime()) {
        setError('The end time cannot be before the start time.')
        return
      }
      endTs = Timestamp.fromDate(endDate)
    }

    setSubmitting(true)
    try {
      if (isEdit && existing) {
        await updateDoc(doc(db, EVENTS_COLLECTION, existing.id), {
          title: trimmedTitle,
          description: description.trim(),
          location: location.trim(),
          startAt: Timestamp.fromDate(startDate),
          endAt: endTs,
          updatedAt: serverTimestamp(),
        })
      } else if (props.mode === 'create') {
        await addDoc(collection(db, EVENTS_COLLECTION), {
          title: trimmedTitle,
          description: description.trim(),
          location: location.trim(),
          startAt: Timestamp.fromDate(startDate),
          endAt: endTs,
          createdBy: props.authorUid,
          createdByName: props.authorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not save the event. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) hydrate()
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Edit event"
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="w-full sm:w-auto">
            <Plus /> New event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this event.'
              : 'Schedule a gathering for the community.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              placeholder="Community potluck"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ev-start">Starts</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">
                Ends{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-location">
              Location{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="ev-location"
              placeholder="Community hall, or a video link"
              value={location}
              maxLength={LOCATION_MAX}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc">
              Details{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="ev-desc"
              placeholder="What should people know about this event?"
              value={description}
              maxLength={DESC_MAX}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Spinner /> : null}
              {submitting
                ? 'Saving...'
                : isEdit
                  ? 'Save changes'
                  : 'Schedule event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  title,
  onConfirm,
  deleting,
}: {
  title: string
  onConfirm: () => void
  deleting: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Delete event"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this event?</DialogTitle>
          <DialogDescription>
            "{title}" will be permanently removed for everyone. This can't be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Keep event
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? <Spinner /> : null}
            {deleting ? 'Deleting...' : 'Delete event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
