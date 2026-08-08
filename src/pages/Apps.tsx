import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast, ROLE_LABELS } from '@/config/roles'
import { APPS, appHost, type AppLink } from '@/config/apps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function AppCard({ app, canAccess }: { app: AppLink; canAccess: boolean }) {
  const inner = (
    <Card
      className={cn(
        'group relative flex h-full flex-col p-5 transition-all',
        canAccess
          ? 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'
          : 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'grid size-11 place-items-center rounded-xl bg-accent',
            app.accent,
          )}
        >
          <app.icon className="size-5" />
        </div>
        {canAccess ? (
          <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        ) : (
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" /> {ROLE_LABELS[app.minRole ?? 'member']}
          </Badge>
        )}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{app.name}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">
        {app.description}
      </p>
      <p className="mt-3 truncate text-xs font-medium text-muted-foreground">
        {appHost(app)}
      </p>
    </Card>
  )

  if (!canAccess) return inner
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      {inner}
    </a>
  )
}

export function Apps() {
  const { profile } = useAuth()

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Apps &amp; Games
        </h1>
        <p className="mt-1 text-muted-foreground">
          Community apps and games. Made by the community, for the community.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {APPS.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            canAccess={hasAtLeast(profile?.role, app.minRole ?? 'member')}
          />
        ))}

        <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-5 text-center">
          <Sparkles className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">More coming soon</p>
          <p className="text-xs text-muted-foreground">
            New community apps and games will show up here.
          </p>
        </Card>
      </div>
    </div>
  )
}
