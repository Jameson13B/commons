import { useEffect, useState, type FormEvent } from 'react'
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
} from 'firebase/firestore'
import { ArrowLeft, Bell, Plus, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast } from '@/config/roles'
import type { Announcement } from '@/lib/types'
import { initials } from '@/lib/user'
import { formatAbsolute, formatRelative } from '@/lib/date'
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

const ANNOUNCEMENTS_COLLECTION = 'announcements'
const TITLE_MAX = 140
const BODY_MAX = 5000

export function Announcements() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canManage = hasAtLeast(profile?.role, 'moderator')

  useEffect(() => {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Announcement,
        )
        setItems(rows)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load announcements. Check your access level.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

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
            Announcements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Official updates and news from the community.
          </p>
        </div>
        {canManage ? <PostDialog authorName={profile?.displayName ?? 'Unknown'} authorUid={user?.uid ?? ''} /> : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Spinner /> Loading announcements...
        </div>
      ) : error ? (
        <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Bell className="size-6 text-muted-foreground" />
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? 'Post the first update to get the word out.'
              : 'Check back soon for community updates.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({
  item,
  canManage,
}: {
  item: Announcement
  canManage: boolean
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, item.id))
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/10">
            {initials(item.authorName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {item.authorName}
            </p>
            <p
              className="text-xs text-muted-foreground"
              title={formatAbsolute(item.createdAt)}
            >
              {formatRelative(item.createdAt)}
            </p>
          </div>
        </div>
        {canManage ? (
          <DeleteDialog
            title={item.title}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        ) : null}
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h2>
      {item.body ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {item.body}
        </p>
      ) : null}
    </Card>
  )
}

function PostDialog({
  authorName,
  authorUid,
}: {
  authorName: string
  authorUid: string
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedTitle = title.trim()
  const canSubmit = trimmedTitle.length > 0 && !submitting

  function reset() {
    setTitle('')
    setBody('')
    setError(null)
    setSubmitting(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
        title: trimmedTitle,
        body: body.trim(),
        authorUid,
        authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      reset()
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not post the announcement. Please try again.')
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
          <Plus /> New announcement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            Share an update with the whole community.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              placeholder="What's happening?"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ann-body">Details</Label>
              <span className="text-xs text-muted-foreground">
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <Textarea
              id="ann-body"
              placeholder="Add the details of your announcement..."
              value={body}
              maxLength={BODY_MAX}
              rows={6}
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
              {submitting ? 'Posting...' : 'Post announcement'}
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
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Delete announcement"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete announcement?</DialogTitle>
          <DialogDescription>
            "{title}" will be permanently removed for everyone. This can't be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? <Spinner /> : null}
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
