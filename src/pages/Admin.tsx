import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { Check, ChevronDown, ShieldBan, ShieldCheck, UserCog } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import {
  ROLE_LABELS,
  ROLES,
  STATUS_LABELS,
  type AccountStatus,
  type Role,
} from '@/config/roles'
import type { UserProfile } from '@/lib/types'
import { initials, roleBadgeVariant } from '@/lib/user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const USERS_COLLECTION = 'users'

async function patchUser(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

function statusBadge(status: AccountStatus) {
  const variant =
    status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'destructive'
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>
}

function UserRow({ member, isSelf }: { member: UserProfile; isSelf: boolean }) {
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      console.error('[Commons] Admin action failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(member.displayName)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{member.displayName}</span>
            {isSelf ? (
              <span className="text-xs text-muted-foreground">(you)</span>
            ) : null}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {member.phoneNumber ?? 'No phone on file'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={roleBadgeVariant(member.role)}>
          {ROLE_LABELS[member.role]}
        </Badge>
        {statusBadge(member.status)}

        {member.status === 'pending' ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(() =>
                patchUser(member.uid, {
                  status: 'active',
                  role: member.role === 'guest' ? 'member' : member.role,
                }),
              )
            }
          >
            {busy ? <Spinner /> : <Check />}
            Approve
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy}>
              <UserCog />
              Manage
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Set role</DropdownMenuLabel>
            {ROLES.map((role: Role) => (
              <DropdownMenuItem
                key={role}
                disabled={member.role === role}
                onSelect={() => run(() => patchUser(member.uid, { role }))}
              >
                {member.role === role ? (
                  <Check className="text-primary" />
                ) : (
                  <span className="size-4" />
                )}
                {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            {member.status !== 'active' ? (
              <DropdownMenuItem
                onSelect={() => run(() => patchUser(member.uid, { status: 'active' }))}
              >
                <ShieldCheck /> Activate
              </DropdownMenuItem>
            ) : null}
            {member.status !== 'suspended' && !isSelf ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  run(() => patchUser(member.uid, { status: 'suspended' }))
                }
              >
                <ShieldBan /> Suspend
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function Admin() {
  const { user } = useAuth()
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMembers(snap.docs.map((d) => d.data() as UserProfile))
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load members. Check your Firestore permissions.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const pending = useMemo(
    () => members.filter((m) => m.status === 'pending').length,
    [members],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Admin Console
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage members, approve new sign-ups, and assign roles.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total members</p>
          <p className="mt-1 text-2xl font-semibold">{members.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending approval</p>
          <p className="mt-1 text-2xl font-semibold">{pending}</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="mt-1 text-2xl font-semibold">
            {members.filter((m) => m.role === 'admin').length}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Spinner /> Loading members...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-destructive">{error}</div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No members yet.
          </div>
        ) : (
          members.map((member) => (
            <UserRow
              key={member.uid}
              member={member}
              isSelf={member.uid === user?.uid}
            />
          ))
        )}
      </Card>
    </div>
  )
}
