import { Link } from 'react-router-dom'
import { Clock, Lock, PartyPopper } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/config/roles'
import {
  accessibleEntries,
  isDivider,
  moduleHref,
  type ModuleDef,
} from '@/config/modules'
import { brand } from '@/config/brand'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function ModuleCard({ mod, canAccess }: { mod: ModuleDef; canAccess: boolean }) {
  const disabled = !canAccess || mod.comingSoon
  const inner = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden p-5 transition-all',
        disabled
          ? 'opacity-70'
          : 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'grid size-11 place-items-center rounded-xl bg-accent',
            mod.accent,
          )}
        >
          <mod.icon className="size-5" />
        </div>
        {mod.comingSoon ? (
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" /> Soon
          </Badge>
        ) : !canAccess ? (
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" /> {ROLE_LABELS[mod.minRole]}
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{mod.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
    </Card>
  )

  if (disabled) return inner
  return (
    <Link to={moduleHref(mod)} className="block h-full">
      {inner}
    </Link>
  )
}

function StatusBanner() {
  const { profile } = useAuth()
  if (!profile) return null

  if (profile.status === 'suspended') {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 text-destructive" />
          <div>
            <h2 className="font-semibold">Your account is suspended</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Access to community systems is currently paused. Please reach out
              to an administrator if you think this is a mistake.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (profile.status === 'pending') {
    return (
      <Card className="border-warning/40 bg-warning/10 p-6">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 text-warning-foreground" />
          <div>
            <h2 className="font-semibold">You're on the waitlist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thanks for joining {brand.name}! An administrator will review and
              approve your account soon. You'll unlock community tools once
              you're approved.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return null
}

export function Dashboard() {
  const { profile } = useAuth()
  if (!profile) return null

  const approved = profile.status === 'active'
  const entries = accessibleEntries(profile.role)
  const hasModules = entries.some((e) => !isDivider(e))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {profile.displayName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {approved
            ? 'Here are the systems available to you.'
            : `Getting you set up on ${brand.name}.`}
        </p>
      </div>

      <StatusBanner />

      {approved ? (
        hasModules ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, i) =>
              isDivider(entry) ? (
                <div
                  key={`divider-${i}`}
                  className="col-span-full flex items-center gap-3 pt-2"
                >
                  {entry.label ? (
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {entry.label}
                    </span>
                  ) : null}
                  <span className="h-0.5 flex-1 rounded-full bg-border" />
                </div>
              ) : (
                <ModuleCard key={entry.id} mod={entry} canAccess />
              ),
            )}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <PartyPopper className="size-6 text-primary" />
            <p className="font-medium">You're all set</p>
            <p className="text-sm text-muted-foreground">
              No systems are assigned to your role yet. Check back soon.
            </p>
          </Card>
        )
      ) : null}
    </div>
  )
}
