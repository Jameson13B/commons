import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CHANGELOG_ICON } from '@/config/modules'
import { CHANGELOG_ENTRIES } from '@/config/changelog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Changelog() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <CHANGELOG_ICON className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Changelog
          </h1>
          <p className="mt-1 text-muted-foreground">
            What&apos;s shipped in Commons, version by version.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {CHANGELOG_ENTRIES.map((entry) => (
          <Card key={entry.version} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                v{entry.version}
              </h2>
              <span className="text-xs text-muted-foreground">{entry.date}</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {entry.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
