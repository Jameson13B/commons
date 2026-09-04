import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  ArrowLeft,
  Check,
  Lightbulb,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Stamp,
  Trash2,
  X,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast } from '@/config/roles'
import type { ConsularTrip, GuestVisaApplication, TravelTip, VisaStatus } from '@/lib/types'
import { formatDateOnly, toDateInputValue } from '@/lib/date'
import { Badge, type BadgeProps } from '@/components/ui/badge'
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

const TRIPS_COLLECTION = 'consularTrips'
const TIPS_COLLECTION = 'travelTips'
const VISAS_COLLECTION = 'guestVisas'
const PLACE_MAX = 140
const NOTES_MAX = 2000
const TIP_MAX = 2000
const PURPOSE_MAX = 2000

const VISA_STATUS_META: Record<VisaStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pending review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  denied: { label: 'Denied', variant: 'destructive' },
}

type SectionTab = 'board' | 'tips' | 'visas'

export function Consular() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<SectionTab>('board')

  const [trips, setTrips] = useState<ConsularTrip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [tripsError, setTripsError] = useState<string | null>(null)

  const [tips, setTips] = useState<TravelTip[]>([])
  const [tipsLoading, setTipsLoading] = useState(true)
  const [tipsError, setTipsError] = useState<string | null>(null)

  const [visas, setVisas] = useState<GuestVisaApplication[]>([])
  const [visasLoading, setVisasLoading] = useState(true)
  const [visasError, setVisasError] = useState<string | null>(null)

  const canModerate = hasAtLeast(profile?.role, 'moderator')
  const isAdmin = hasAtLeast(profile?.role, 'admin')

  useEffect(() => {
    const q = query(collection(db, TRIPS_COLLECTION), orderBy('startAt', 'asc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ConsularTrip))
        setTripsLoading(false)
      },
      (err) => {
        console.error(err)
        setTripsError('Could not load the travel board. Check your access level.')
        setTripsLoading(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    const q = query(collection(db, TIPS_COLLECTION), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTips(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TravelTip))
        setTipsLoading(false)
      },
      (err) => {
        console.error(err)
        setTipsError('Could not load travel tips. Check your access level.')
        setTipsLoading(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    const q = query(collection(db, VISAS_COLLECTION), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVisas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GuestVisaApplication))
        setVisasLoading(false)
      },
      (err) => {
        console.error(err)
        setVisasError('Could not load guest visas. Check your access level.')
        setVisasLoading(false)
      },
    )
    return unsub
  }, [])

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const up: ConsularTrip[] = []
    const pa: ConsularTrip[] = []
    for (const t of trips) {
      const end = (t.endAt ?? t.startAt)?.toMillis() ?? 0
      if (end && end < now) pa.push(t)
      else up.push(t)
    }
    pa.reverse()
    return { upcoming: up, past: pa }
  }, [trips])

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
            Consular Portal
          </h1>
          <p className="mt-1 text-muted-foreground">
            Everything consular related: future vacations, travel tips, and
            Commons visitors.
          </p>
        </div>
        {tab === 'board' ? (
          <TripFormDialog
            mode="create"
            authorName={profile?.displayName ?? 'Unknown'}
            authorUid={user?.uid ?? ''}
          />
        ) : tab === 'tips' ? (
          <TipFormDialog
            mode="create"
            authorName={profile?.displayName ?? 'Unknown'}
            authorUid={user?.uid ?? ''}
          />
        ) : (
          <VisaFormDialog
            submittedByName={profile?.displayName ?? 'Unknown'}
            submittedBy={user?.uid ?? ''}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'board' ? 'default' : 'outline'}
          onClick={() => setTab('board')}
          className="h-8 gap-1.5"
        >
          <Plane className="size-3.5" /> Travel board
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'tips' ? 'default' : 'outline'}
          onClick={() => setTab('tips')}
          className="h-8 gap-1.5"
        >
          <Lightbulb className="size-3.5" /> Travel tips
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'visas' ? 'default' : 'outline'}
          onClick={() => setTab('visas')}
          className="h-8 gap-1.5"
        >
          <Stamp className="size-3.5" /> Guest visas
        </Button>
      </div>

      {tab === 'board' ? (
        <TravelBoard
          loading={tripsLoading}
          error={tripsError}
          upcoming={upcoming}
          past={past}
          myUid={user?.uid ?? null}
          canModerate={canModerate}
        />
      ) : tab === 'tips' ? (
        <TravelTips
          loading={tipsLoading}
          error={tipsError}
          tips={tips}
          myUid={user?.uid ?? null}
          canModerate={canModerate}
        />
      ) : (
        <GuestVisas
          loading={visasLoading}
          error={visasError}
          visas={visas}
          myUid={user?.uid ?? null}
          isAdmin={isAdmin}
          reviewerUid={user?.uid ?? ''}
          reviewerName={profile?.displayName ?? 'Unknown'}
        />
      )}
    </div>
  )
}

function TravelBoard({
  loading,
  error,
  upcoming,
  past,
  myUid,
  canModerate,
}: {
  loading: boolean
  error: string | null
  upcoming: ConsularTrip[]
  past: ConsularTrip[]
  myUid: string | null
  canModerate: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner /> Loading the travel board...
      </div>
    )
  }
  if (error) {
    return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
  }
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center">
        <Plane className="size-6 text-muted-foreground" />
        <p className="font-medium">No trips on the board yet</p>
        <p className="text-sm text-muted-foreground">
          Post an upcoming vacation to let the community know.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nothing upcoming right now.
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((t) => (
              <TripCard key={t.id} trip={t} myUid={myUid} canModerate={canModerate} />
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
            {past.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                myUid={myUid}
                canModerate={canModerate}
                dimmed
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function TripCard({
  trip,
  myUid,
  canModerate,
  dimmed,
}: {
  trip: ConsularTrip
  myUid: string | null
  canModerate: boolean
  dimmed?: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const isOwner = myUid != null && myUid === trip.createdBy
  const canManage = isOwner || canModerate

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, TRIPS_COLLECTION, trip.id))
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Card className={`flex gap-4 p-4 sm:p-5 ${dimmed ? 'opacity-70' : ''}`}>
      <div className="hidden size-10 shrink-0 place-items-center rounded-lg bg-accent text-sky-500 sm:grid">
        <Plane className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-semibold leading-tight">
            Traveling to {trip.place}
          </h3>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <TripFormDialog mode="edit" trip={trip} />
              <DeleteDialog
                title={`the trip to ${trip.place}`}
                onConfirm={handleDelete}
                deleting={deleting}
                label="trip"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {formatDateOnly(trip.startAt)}
            {trip.endAt ? ` – ${formatDateOnly(trip.endAt)}` : ''}
          </span>
        </div>

        {trip.notes ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {trip.notes}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-muted-foreground">
          Posted by {trip.createdByName}
        </p>
      </div>
    </Card>
  )
}

type TripFormProps =
  | { mode: 'create'; authorName: string; authorUid: string; trip?: never }
  | { mode: 'edit'; trip: ConsularTrip; authorName?: never; authorUid?: never }

function TripFormDialog(props: TripFormProps) {
  const isEdit = props.mode === 'edit'
  const existing = isEdit ? props.trip : null

  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState('')
  const [notes, setNotes] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function hydrate() {
    setPlace(existing?.place ?? '')
    setNotes(existing?.notes ?? '')
    setStart(existing?.startAt ? toDateInputValue(existing.startAt.toDate()) : '')
    setEnd(existing?.endAt ? toDateInputValue(existing.endAt.toDate()) : '')
    setError(null)
    setSubmitting(false)
  }

  const trimmedPlace = place.trim()
  const canSubmit = trimmedPlace.length > 0 && start !== '' && !submitting

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)

    const startDate = new Date(`${start}T00:00:00`)
    if (Number.isNaN(startDate.getTime())) {
      setError('Please choose a valid start date.')
      return
    }
    let endTs: Timestamp | null = null
    if (end) {
      const endDate = new Date(`${end}T00:00:00`)
      if (Number.isNaN(endDate.getTime())) {
        setError('Please choose a valid end date.')
        return
      }
      if (endDate.getTime() < startDate.getTime()) {
        setError('The end date cannot be before the start date.')
        return
      }
      endTs = Timestamp.fromDate(endDate)
    }

    setSubmitting(true)
    try {
      if (isEdit && existing) {
        await updateDoc(doc(db, TRIPS_COLLECTION, existing.id), {
          place: trimmedPlace,
          notes: notes.trim(),
          startAt: Timestamp.fromDate(startDate),
          endAt: endTs,
          updatedAt: serverTimestamp(),
        })
      } else if (props.mode === 'create') {
        await addDoc(collection(db, TRIPS_COLLECTION), {
          place: trimmedPlace,
          notes: notes.trim(),
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
      setError('Could not save the trip. Please try again.')
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
            aria-label="Edit trip"
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="w-full sm:w-auto">
            <Plus /> New trip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit trip' : 'New trip'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this trip.'
              : 'Share an upcoming vacation away from Commons.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-place">Destination</Label>
            <Input
              id="trip-place"
              placeholder="Lisbon, Portugal"
              value={place}
              maxLength={PLACE_MAX}
              onChange={(e) => setPlace(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trip-start">Starts</Label>
              <Input
                id="trip-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-end">
                Ends{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="trip-end"
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-notes">
              Notes{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="trip-notes"
              placeholder="Anything the community should know?"
              value={notes}
              maxLength={NOTES_MAX}
              rows={4}
              onChange={(e) => setNotes(e.target.value)}
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
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Post trip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TravelTips({
  loading,
  error,
  tips,
  myUid,
  canModerate,
}: {
  loading: boolean
  error: string | null
  tips: TravelTip[]
  myUid: string | null
  canModerate: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner /> Loading travel tips...
      </div>
    )
  }
  if (error) {
    return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
  }
  if (tips.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center">
        <Lightbulb className="size-6 text-muted-foreground" />
        <p className="font-medium">No travel tips yet</p>
        <p className="text-sm text-muted-foreground">
          Share a tip for a destination you know well.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {tips.map((tip) => (
        <TipCard key={tip.id} tip={tip} myUid={myUid} canModerate={canModerate} />
      ))}
    </div>
  )
}

function TipCard({
  tip,
  myUid,
  canModerate,
}: {
  tip: TravelTip
  myUid: string | null
  canModerate: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const isOwner = myUid != null && myUid === tip.authorUid
  const canManage = isOwner || canModerate

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, TIPS_COLLECTION, tip.id))
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="min-w-0 truncate font-semibold leading-tight">
            {tip.destination}
          </h3>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <TipFormDialog mode="edit" tip={tip} />
            <DeleteDialog
              title={`the tip for ${tip.destination}`}
              onConfirm={handleDelete}
              deleting={deleting}
              label="tip"
            />
          </div>
        ) : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {tip.tip}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">By {tip.authorName}</p>
    </Card>
  )
}

type TipFormProps =
  | { mode: 'create'; authorName: string; authorUid: string; tip?: never }
  | { mode: 'edit'; tip: TravelTip; authorName?: never; authorUid?: never }

function TipFormDialog(props: TipFormProps) {
  const isEdit = props.mode === 'edit'
  const existing = isEdit ? props.tip : null

  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function hydrate() {
    setDestination(existing?.destination ?? '')
    setBody(existing?.tip ?? '')
    setError(null)
    setSubmitting(false)
  }

  const trimmedDestination = destination.trim()
  const trimmedBody = body.trim()
  const canSubmit = trimmedDestination.length > 0 && trimmedBody.length > 0 && !submitting

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && existing) {
        await updateDoc(doc(db, TIPS_COLLECTION, existing.id), {
          destination: trimmedDestination,
          tip: trimmedBody,
          updatedAt: serverTimestamp(),
        })
      } else if (props.mode === 'create') {
        await addDoc(collection(db, TIPS_COLLECTION), {
          destination: trimmedDestination,
          tip: trimmedBody,
          authorUid: props.authorUid,
          authorName: props.authorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not save the tip. Please try again.')
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
            aria-label="Edit tip"
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="w-full sm:w-auto">
            <Plus /> New tip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tip' : 'New travel tip'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this travel tip.'
              : 'Share something useful for members traveling to a destination.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tip-destination">Destination</Label>
            <Input
              id="tip-destination"
              placeholder="Tokyo, Japan"
              value={destination}
              maxLength={PLACE_MAX}
              onChange={(e) => setDestination(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tip-body">Tip</Label>
              <span className="text-xs text-muted-foreground">
                {body.length}/{TIP_MAX}
              </span>
            </div>
            <Textarea
              id="tip-body"
              placeholder="What should a fellow member know before they go?"
              value={body}
              maxLength={TIP_MAX}
              rows={5}
              onChange={(e) => setBody(e.target.value)}
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
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Post tip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GuestVisas({
  loading,
  error,
  visas,
  myUid,
  isAdmin,
  reviewerUid,
  reviewerName,
}: {
  loading: boolean
  error: string | null
  visas: GuestVisaApplication[]
  myUid: string | null
  isAdmin: boolean
  reviewerUid: string
  reviewerName: string
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner /> Loading guest visas...
      </div>
    )
  }
  if (error) {
    return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
  }
  if (visas.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center">
        <Stamp className="size-6 text-muted-foreground" />
        <p className="font-medium">No guest visa applications yet</p>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Applications submitted by members will appear here for review.'
            : 'Submit an application for a guest visiting Commons.'}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {visas.map((visa) => (
        <VisaCard
          key={visa.id}
          visa={visa}
          myUid={myUid}
          isAdmin={isAdmin}
          reviewerUid={reviewerUid}
          reviewerName={reviewerName}
        />
      ))}
    </div>
  )
}

function VisaCard({
  visa,
  myUid,
  isAdmin,
  reviewerUid,
  reviewerName,
}: {
  visa: GuestVisaApplication
  myUid: string | null
  isAdmin: boolean
  reviewerUid: string
  reviewerName: string
}) {
  const [reviewing, setReviewing] = useState<VisaStatus | null>(null)
  const [deleting, setDeleting] = useState(false)
  const isOwner = myUid != null && myUid === visa.submittedBy
  const isPending = visa.status === 'pending'
  const meta = VISA_STATUS_META[visa.status]

  async function review(status: 'approved' | 'denied') {
    setReviewing(status)
    try {
      await updateDoc(doc(db, VISAS_COLLECTION, visa.id), {
        status,
        reviewedBy: reviewerUid,
        reviewedByName: reviewerName,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setReviewing(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, VISAS_COLLECTION, visa.id))
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <h3 className="mt-2 font-semibold leading-tight">{visa.guestName}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {visa.origin ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                From {visa.origin}
              </span>
            ) : null}
            <span>
              {formatDateOnly(visa.startAt)}
              {visa.endAt ? ` – ${formatDateOnly(visa.endAt)}` : ''}
            </span>
          </div>
        </div>

        {(isOwner && isPending) || isAdmin ? (
          <DeleteDialog
            title={`the visa application for ${visa.guestName}`}
            onConfirm={handleDelete}
            deleting={deleting}
            label="application"
          />
        ) : null}
      </div>

      {visa.purpose ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {visa.purpose}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-muted-foreground">
        Submitted by {visa.submittedByName}
        {visa.reviewedByName ? ` · Reviewed by ${visa.reviewedByName}` : ''}
      </p>

      {isAdmin && isPending ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={reviewing !== null}
            onClick={() => void review('approved')}
            className="gap-1.5"
          >
            {reviewing === 'approved' ? <Spinner className="size-3.5" /> : <Check className="size-3.5" />}
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={reviewing !== null}
            onClick={() => void review('denied')}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            {reviewing === 'denied' ? <Spinner className="size-3.5" /> : <X className="size-3.5" />}
            Deny
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

function VisaFormDialog({
  submittedBy,
  submittedByName,
}: {
  submittedBy: string
  submittedByName: string
}) {
  const [open, setOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [origin, setOrigin] = useState('')
  const [purpose, setPurpose] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setGuestName('')
    setOrigin('')
    setPurpose('')
    setStart('')
    setEnd('')
    setError(null)
    setSubmitting(false)
  }

  const trimmedGuestName = guestName.trim()
  const canSubmit = trimmedGuestName.length > 0 && start !== '' && !submitting

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)

    const startDate = new Date(`${start}T00:00:00`)
    if (Number.isNaN(startDate.getTime())) {
      setError('Please choose a valid start date.')
      return
    }
    let endTs: Timestamp | null = null
    if (end) {
      const endDate = new Date(`${end}T00:00:00`)
      if (Number.isNaN(endDate.getTime())) {
        setError('Please choose a valid end date.')
        return
      }
      if (endDate.getTime() < startDate.getTime()) {
        setError('The end date cannot be before the start date.')
        return
      }
      endTs = Timestamp.fromDate(endDate)
    }

    setSubmitting(true)
    try {
      await addDoc(collection(db, VISAS_COLLECTION), {
        guestName: trimmedGuestName,
        origin: origin.trim(),
        purpose: purpose.trim(),
        startAt: Timestamp.fromDate(startDate),
        endAt: endTs,
        status: 'pending',
        submittedBy,
        submittedByName,
        reviewedBy: null,
        reviewedByName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      reset()
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not submit the application. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus /> New visa application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New guest visa application</DialogTitle>
          <DialogDescription>
            Submit a request for a guest visiting Commons. An admin will
            review it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visa-guest">Guest name</Label>
            <Input
              id="visa-guest"
              placeholder="Jordan Rivera"
              value={guestName}
              maxLength={PLACE_MAX}
              onChange={(e) => setGuestName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visa-origin">
              Coming from{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="visa-origin"
              placeholder="Austin, Texas"
              value={origin}
              maxLength={PLACE_MAX}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visa-start">Arriving</Label>
              <Input
                id="visa-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visa-end">
                Departing{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="visa-end"
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visa-purpose">
              Purpose of visit{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="visa-purpose"
              placeholder="Why is this guest visiting Commons?"
              value={purpose}
              maxLength={PURPOSE_MAX}
              rows={4}
              onChange={(e) => setPurpose(e.target.value)}
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
              {submitting ? 'Submitting...' : 'Submit application'}
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
  label,
}: {
  title: string
  onConfirm: () => void
  deleting: boolean
  label: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${label}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this {label}?</DialogTitle>
          <DialogDescription>
            {title[0].toUpperCase() + title.slice(1)} will be permanently removed.
            This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Keep {label}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? <Spinner /> : null}
            {deleting ? 'Deleting...' : `Delete ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
