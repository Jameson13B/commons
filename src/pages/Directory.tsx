import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import {
  ArrowLeft,
  Check,
  Copy,
  Phone,
  Search,
  Send,
  UserPlus,
  Users,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast, ROLE_LABELS } from '@/config/roles'
import { brand } from '@/config/brand'
import type { UserProfile } from '@/lib/types'
import { initials, roleBadgeVariant } from '@/lib/user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const USERS_COLLECTION = 'users'

/** Best-effort check for a device that can actually open an `sms:` link. */
function canSendSms(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isMobileUA =
    /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Mobile/i.test(ua)
  // iPadOS 13+ reports a desktop UA but exposes touch points.
  const isTouchMac =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isMobileUA || isTouchMac
}

function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [smsAvailable] = useState(canSendSms)

  const link = `${window.location.origin}/login`
  const message = `You're invited to join ${brand.name}. Sign in with your phone to get started: ${link}`
  const smsHref = `sms:?&body=${encodeURIComponent(message)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setCopied(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full shrink-0 sm:w-auto">
          <UserPlus /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>
            Share the invite link, or open a prewritten text to send it along.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invite-link">Invite link</Label>
          <div className="flex gap-2">
            <Input
              id="invite-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <Check className="text-success" /> Copied
                </>
              ) : (
                <>
                  <Copy /> Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Anyone with this link can request access; they'll still verify their
            own phone number.
          </p>
        </div>

        {smsAvailable ? (
          <DialogFooter>
            <Button asChild className="w-full sm:w-auto">
              <a href={smsHref}>
                <Send /> Send via text
              </a>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function MemberCard({
  member,
  isSelf,
  canSeePhone,
}: {
  member: UserProfile
  isSelf: boolean
  canSeePhone: boolean
}) {
  return (
    <Card className="flex items-center gap-3 p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/10">
        {initials(member.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate font-medium leading-tight">
            {member.displayName}
          </p>
          {isSelf ? (
            <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              You
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant={roleBadgeVariant(member.role)}>
            {ROLE_LABELS[member.role]}
          </Badge>
          {canSeePhone && member.phoneNumber ? (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {member.phoneNumber}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export function Directory() {
  const { user, profile } = useAuth()
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const canSeePhone = hasAtLeast(profile?.role, 'moderator')

  useEffect(() => {
    // Only approved members are listed in the directory.
    const q = query(
      collection(db, USERS_COLLECTION),
      where('status', '==', 'active'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as UserProfile)
        rows.sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, {
            sensitivity: 'base',
          }),
        )
        setMembers(rows)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load the directory. Check your access level.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return members
    return members.filter((m) => m.displayName.toLowerCase().includes(term))
  }, [members, search])

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
            Member Directory
          </h1>
          <p className="mt-1 text-muted-foreground">
            {members.length} {members.length === 1 ? 'member' : 'members'} in the
            community.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <InviteDialog />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Spinner /> Loading members...
        </div>
      ) : error ? (
        <Card className="p-10 text-center text-sm text-destructive">{error}</Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Users className="size-6 text-muted-foreground" />
          <p className="font-medium">
            {search ? 'No members match your search' : 'No members yet'}
          </p>
          <p className="text-sm text-muted-foreground">
            {search
              ? 'Try a different name.'
              : 'Approved members will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member) => (
            <MemberCard
              key={member.uid}
              member={member}
              isSelf={member.uid === user?.uid}
              canSeePhone={canSeePhone}
            />
          ))}
        </div>
      )}
    </div>
  )
}
