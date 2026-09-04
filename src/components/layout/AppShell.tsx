import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { brand } from '@/config/brand'
import {
  accessibleEntries,
  DASHBOARD_ICON,
  isDivider,
  moduleHref,
} from '@/config/modules'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/layout/BrandMark'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserMenu } from '@/components/layout/UserMenu'

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth()
  const entries = accessibleEntries(profile?.role)

  const baseClass =
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      baseClass,
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    )

  return (
    <nav className="flex flex-col gap-1">
      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        <DASHBOARD_ICON className="size-4 shrink-0" />
        Dashboard
      </NavLink>
      <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Systems
      </div>
      {entries.map((entry, i) =>
        isDivider(entry) ? (
          <div key={`divider-${i}`} className="my-2 flex items-center gap-2 px-3">
            {entry.label ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {entry.label}
              </span>
            ) : null}
            <span className="h-0.5 flex-1 rounded-full bg-border" />
          </div>
        ) : (
          <NavLink
            key={entry.id}
            to={moduleHref(entry)}
            className={linkClass}
            onClick={onNavigate}
          >
            <entry.icon className="size-4 shrink-0" />
            <span className="truncate">{entry.name}</span>
          </NavLink>
        ),
      )}
    </nav>
  )
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card/40 px-4 py-5 md:flex">
        <div className="px-2 pb-6">
          <BrandMark showName size="sm" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems />
        </div>
        <p className="px-3 pt-4 text-xs text-muted-foreground">
          {brand.name} · v{brand.version}
        </p>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-border bg-card px-4 py-5">
            <div className="flex items-center justify-between px-2 pb-6">
              <BrandMark showName size="sm" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <div className="md:hidden">
            <BrandMark size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
