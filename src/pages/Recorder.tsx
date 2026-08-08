import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  Archive,
  ArrowLeft,
  FileText,
  Gavel,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast } from '@/config/roles'
import type {
  CommunityRecord,
  RecordStatus,
  RecordType,
  VoteOutcome,
} from '@/lib/types'
import { formatDateOnly, toDateInputValue } from '@/lib/date'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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

const RECORDS_COLLECTION = 'records'
const TITLE_MAX = 160
const REF_MAX = 40
const SUMMARY_MAX = 300
const BODY_MAX = 20000

const RECORD_TYPES: {
  value: RecordType
  label: string
  plural: string
  icon: LucideIcon
  accent: string
}[] = [
  { value: 'paper', label: 'Paper', plural: 'Papers', icon: FileText, accent: 'text-sky-500' },
  { value: 'vote', label: 'Vote', plural: 'Votes', icon: Gavel, accent: 'text-amber-500' },
  { value: 'policy', label: 'Policy', plural: 'Policies', icon: Scale, accent: 'text-violet-500' },
]

const TYPE_META = Object.fromEntries(
  RECORD_TYPES.map((t) => [t.value, t]),
) as Record<RecordType, (typeof RECORD_TYPES)[number]>

const OUTCOME_META: Record<
  VoteOutcome,
  { label: string; variant: BadgeProps['variant'] }
> = {
  passed: { label: 'Passed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  tabled: { label: 'Tabled', variant: 'warning' },
}

type TypeFilter = RecordType | 'all'
type StatusFilter = RecordStatus | 'all'

function recordMillis(r: CommunityRecord): number {
  return (r.recordDate ?? r.createdAt)?.toMillis() ?? 0
}

export function Recorder() {
  const { user, profile } = useAuth()
  const isAdmin = hasAtLeast(profile?.role, 'admin')

  const [items, setItems] = useState<CommunityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    // Members may only read published records (the security rules require the
    // status filter); admins can see everything, including drafts.
    const q = isAdmin
      ? query(collection(db, RECORDS_COLLECTION))
      : query(
          collection(db, RECORDS_COLLECTION),
          where('status', '==', 'published'),
        )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as CommunityRecord,
        )
        rows.sort((a, b) => recordMillis(b) - recordMillis(a))
        setItems(rows)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load records. Check your access level.')
        setLoading(false)
      },
    )
    return unsub
  }, [isAdmin])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (isAdmin && statusFilter !== 'all' && r.status !== statusFilter)
        return false
      if (!term) return true
      return (
        r.title.toLowerCase().includes(term) ||
        r.summary.toLowerCase().includes(term) ||
        r.referenceNumber.toLowerCase().includes(term)
      )
    })
  }, [items, search, typeFilter, statusFilter, isAdmin])

  const draftCount = useMemo(
    () => (isAdmin ? items.filter((r) => r.status === 'draft').length : 0),
    [items, isAdmin],
  )

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
            Community Recorder
          </h1>
          <p className="mt-1 text-muted-foreground">
            The official archive of community papers, votes, and policies.
            {isAdmin && draftCount > 0
              ? ` ${draftCount} draft${draftCount === 1 ? '' : 's'} in progress.`
              : ''}
          </p>
        </div>
        {isAdmin ? (
          <RecordFormDialog
            mode="create"
            authorName={profile?.displayName ?? 'Unknown'}
            authorUid={user?.uid ?? ''}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={typeFilter === 'all'}
            onClick={() => setTypeFilter('all')}
          >
            All types
          </FilterChip>
          {RECORD_TYPES.map((t) => (
            <FilterChip
              key={t.value}
              active={typeFilter === t.value}
              onClick={() => setTypeFilter(t.value)}
            >
              <t.icon className="size-3.5" />
              {t.plural}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'published', 'draft'] as StatusFilter[]).map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all'
                    ? 'All statuses'
                    : s === 'published'
                      ? 'Published'
                      : 'Drafts'}
                </FilterChip>
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Spinner /> Loading records...
        </div>
      ) : error ? (
        <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Archive className="size-6 text-muted-foreground" />
          <p className="font-medium">
            {items.length === 0 ? 'No records yet' : 'No records match your filters'}
          </p>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? isAdmin
                ? 'Add the first paper, vote, or policy to start the archive.'
                : 'Published records will appear here.'
              : 'Try a different type, status, or search term.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <RecordCard key={record.id} record={record} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className="h-8 gap-1.5"
    >
      {children}
    </Button>
  )
}

function VoteTally({ record }: { record: CommunityRecord }) {
  const parts: { label: string; value: number | null }[] = [
    { label: 'For', value: record.votesFor },
    { label: 'Against', value: record.votesAgainst },
    { label: 'Abstain', value: record.votesAbstain },
  ]
  const shown = parts.filter((p) => p.value !== null)
  if (shown.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {shown.map((p) => (
        <span key={p.label} className="text-muted-foreground">
          {p.label}{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {p.value}
          </span>
        </span>
      ))}
    </div>
  )
}

function RecordCard({
  record,
  isAdmin,
}: {
  record: CommunityRecord
  isAdmin: boolean
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const meta = TYPE_META[record.type]
  const isDraft = record.status === 'draft'

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, RECORDS_COLLECTION, record.id))
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div
          className={`hidden size-10 shrink-0 place-items-center rounded-lg bg-accent sm:grid ${meta.accent}`}
        >
          <meta.icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <meta.icon className={`size-3 sm:hidden ${meta.accent}`} />
              {meta.label}
            </Badge>
            {record.type === 'vote' && record.voteOutcome ? (
              <Badge variant={OUTCOME_META[record.voteOutcome].variant}>
                {OUTCOME_META[record.voteOutcome].label}
              </Badge>
            ) : null}
            {isDraft ? <Badge variant="warning">Draft</Badge> : null}
          </div>

          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="mt-2 block text-left"
          >
            <h2 className="font-semibold leading-tight tracking-tight hover:underline">
              {record.title}
            </h2>
          </button>

          <p className="mt-1 text-xs text-muted-foreground">
            {record.referenceNumber ? (
              <span className="font-medium">{record.referenceNumber} · </span>
            ) : null}
            {formatDateOnly(record.recordDate)}
          </p>

          {record.summary ? (
            <p className="mt-2 text-sm text-muted-foreground">{record.summary}</p>
          ) : null}

          {record.type === 'vote' ? (
            <div className="mt-3">
              <VoteTally record={record} />
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-8"
              onClick={() => setDetailOpen(true)}
            >
              Read full record
            </Button>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <RecordFormDialog mode="edit" record={record} />
            <DeleteDialog
              title={record.title}
              onConfirm={handleDelete}
              deleting={deleting}
            />
          </div>
        ) : null}
      </div>

      <RecordDetailDialog
        record={record}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </Card>
  )
}

function RecordDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: CommunityRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const meta = TYPE_META[record.type]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <meta.icon className={`size-3 ${meta.accent}`} />
              {meta.label}
            </Badge>
            {record.type === 'vote' && record.voteOutcome ? (
              <Badge variant={OUTCOME_META[record.voteOutcome].variant}>
                {OUTCOME_META[record.voteOutcome].label}
              </Badge>
            ) : null}
            {record.status === 'draft' ? (
              <Badge variant="warning">Draft</Badge>
            ) : null}
          </div>
          <DialogTitle className="mt-2 text-xl">{record.title}</DialogTitle>
          <DialogDescription>
            {record.referenceNumber ? `${record.referenceNumber} · ` : ''}
            {formatDateOnly(record.recordDate)} · Recorded by {record.authorName}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {record.summary ? (
            <p className="text-sm font-medium text-foreground/90">
              {record.summary}
            </p>
          ) : null}

          {record.type === 'vote' ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <VoteTally record={record} />
            </div>
          ) : null}

          {record.body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {record.body}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No additional details recorded.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type RecordFormProps =
  | { mode: 'create'; authorName: string; authorUid: string; record?: never }
  | {
      mode: 'edit'
      record: CommunityRecord
      authorName?: never
      authorUid?: never
    }

function RecordFormDialog(props: RecordFormProps) {
  const isEdit = props.mode === 'edit'
  const existing = isEdit ? props.record : null

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RecordType>('paper')
  const [title, setTitle] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [status, setStatus] = useState<RecordStatus>('draft')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState<VoteOutcome | ''>('')
  const [votesFor, setVotesFor] = useState('')
  const [votesAgainst, setVotesAgainst] = useState('')
  const [votesAbstain, setVotesAbstain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function hydrate() {
    setType(existing?.type ?? 'paper')
    setTitle(existing?.title ?? '')
    setReferenceNumber(existing?.referenceNumber ?? '')
    setRecordDate(
      existing?.recordDate
        ? toDateInputValue(existing.recordDate.toDate())
        : toDateInputValue(new Date()),
    )
    setStatus(existing?.status ?? 'draft')
    setSummary(existing?.summary ?? '')
    setBody(existing?.body ?? '')
    setOutcome(existing?.voteOutcome ?? '')
    setVotesFor(existing?.votesFor != null ? String(existing.votesFor) : '')
    setVotesAgainst(
      existing?.votesAgainst != null ? String(existing.votesAgainst) : '',
    )
    setVotesAbstain(
      existing?.votesAbstain != null ? String(existing.votesAbstain) : '',
    )
    setError(null)
    setSubmitting(false)
  }

  const trimmedTitle = title.trim()
  const canSubmit = trimmedTitle.length > 0 && !submitting

  function parseCount(value: string): number | null {
    const t = value.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)

    const dateTs = recordDate
      ? Timestamp.fromDate(new Date(`${recordDate}T00:00:00`))
      : null

    const isVote = type === 'vote'
    const payload = {
      type,
      title: trimmedTitle,
      referenceNumber: referenceNumber.trim(),
      summary: summary.trim(),
      body: body.trim(),
      status,
      recordDate: dateTs,
      voteOutcome: isVote && outcome ? outcome : null,
      votesFor: isVote ? parseCount(votesFor) : null,
      votesAgainst: isVote ? parseCount(votesAgainst) : null,
      votesAbstain: isVote ? parseCount(votesAbstain) : null,
      updatedAt: serverTimestamp(),
    }

    setSubmitting(true)
    try {
      if (isEdit && existing) {
        await updateDoc(doc(db, RECORDS_COLLECTION, existing.id), {
          ...payload,
          // Stamp publishedAt the first time a record goes public.
          publishedAt:
            status === 'published'
              ? (existing.publishedAt ?? serverTimestamp())
              : null,
        })
      } else if (props.mode === 'create') {
        await addDoc(collection(db, RECORDS_COLLECTION), {
          ...payload,
          authorUid: props.authorUid,
          authorName: props.authorName,
          createdAt: serverTimestamp(),
          publishedAt: status === 'published' ? serverTimestamp() : null,
        })
      }
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not save the record. Please try again.')
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
            aria-label="Edit record"
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="w-full sm:w-auto">
            <Plus /> New record
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit record' : 'New record'}</DialogTitle>
          <DialogDescription>
            Add an official entry to the community archive.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rec-type">Type</Label>
              <Select
                id="rec-type"
                value={type}
                onChange={(e) => setType(e.target.value as RecordType)}
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-status">Status</Label>
              <Select
                id="rec-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RecordStatus)}
              >
                <option value="draft">Draft (only admins can see)</option>
                <option value="published">Published (visible to members)</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-title">Title</Label>
            <Input
              id="rec-title"
              placeholder="Community land-use resolution"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rec-ref">
                Reference #{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="rec-ref"
                placeholder="R-2026-014"
                value={referenceNumber}
                maxLength={REF_MAX}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-date">Record date</Label>
              <Input
                id="rec-date"
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>
          </div>

          {type === 'vote' ? (
            <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="rec-outcome">Outcome</Label>
                <Select
                  id="rec-outcome"
                  value={outcome}
                  onChange={(e) =>
                    setOutcome(e.target.value as VoteOutcome | '')
                  }
                >
                  <option value="">Not recorded</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="tabled">Tabled</option>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rec-for">For</Label>
                  <Input
                    id="rec-for"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={votesFor}
                    onChange={(e) => setVotesFor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec-against">Against</Label>
                  <Input
                    id="rec-against"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={votesAgainst}
                    onChange={(e) => setVotesAgainst(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec-abstain">Abstain</Label>
                  <Input
                    id="rec-abstain"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={votesAbstain}
                    onChange={(e) => setVotesAbstain(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="rec-summary">
              Summary{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="rec-summary"
              placeholder="One-line description shown in the list"
              value={summary}
              maxLength={SUMMARY_MAX}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-body">Details</Label>
            <Textarea
              id="rec-body"
              placeholder="The full text of the record..."
              value={body}
              maxLength={BODY_MAX}
              rows={8}
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
              {submitting
                ? 'Saving...'
                : isEdit
                  ? 'Save changes'
                  : status === 'published'
                    ? 'Publish record'
                    : 'Save draft'}
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
          aria-label="Delete record"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this record?</DialogTitle>
          <DialogDescription>
            "{title}" will be permanently removed from the archive. This can't be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Keep record
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? <Spinner /> : null}
            {deleting ? 'Deleting...' : 'Delete record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
