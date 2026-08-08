import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Hammer } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast } from '@/config/roles'
import { getModule } from '@/config/modules'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Generic host page for a community module. Real modules will replace this
 * with their own UI; for now it renders a consistent "in progress" scaffold
 * and enforces the module's role requirement.
 */
export function ModulePage() {
  const { moduleId } = useParams()
  const { profile } = useAuth()
  const mod = moduleId ? getModule(moduleId) : undefined

  if (!mod) return <Navigate to="/" replace />
  if (!hasAtLeast(profile?.role, mod.minRole)) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>

      <div className="flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-accent">
          <mod.icon className="size-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{mod.name}</h1>
          <p className="text-muted-foreground">{mod.description}</p>
        </div>
      </div>

      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-primary/10">
          <Hammer className="size-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">This system is being built</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The foundation is in place and access control is live. Functionality
          for this module is coming soon as the community OS grows.
        </p>
      </Card>
    </div>
  )
}
