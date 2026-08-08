import {
  Archive,
  Bell,
  CalendarDays,
  Gamepad2,
  LayoutDashboard,
  ScrollText,
  Settings2,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { hasAtLeast, type Role } from "@/config/roles"

/**
 * A "module" is a tool or system inside the community OS. To add a new tool,
 * append an entry here and set its `minRole` -- access control and the
 * dashboard grid update automatically.
 */
export interface ModuleDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  /** Minimum role required to access the module. */
  minRole: Role
  /** Optional accent color (Tailwind text color class) for the icon. */
  accent?: string
  /** Internal route. Defaults to `/m/:id`. Use for special pages like /admin. */
  path?: string
  /** Marks the module as not yet built (shown but disabled with a badge). */
  comingSoon?: boolean
}

/** A visual separator between groups of modules in the list. */
export interface ModuleDivider {
  divider: true
  /** Optional label shown on the divider. */
  label?: string
}

/** An entry in the module list: either a module or a divider. */
export type ModuleEntry = ModuleDef | ModuleDivider

export function isDivider(entry: ModuleEntry): entry is ModuleDivider {
  return "divider" in entry
}

export const MODULES: ModuleEntry[] = [
  {
    id: "announcements",
    name: "Announcements",
    description: "Official updates and news from the community.",
    icon: Bell,
    minRole: "member",
    accent: "text-amber-500",
  },
  {
    id: "events",
    name: "Events & Calendar",
    description: "Upcoming gatherings, meetings, and shared scheduling.",
    icon: CalendarDays,
    minRole: "member",
    accent: "text-violet-500",
  },
  {
    id: "apps",
    name: "Apps & Games",
    description:
      "Access all community apps and games. Made by the community, for the community.",
    icon: Gamepad2,
    minRole: "member",
    accent: "text-teal-500",
  },
  { divider: true },
  {
    id: "directory",
    name: "Member Directory",
    description: "Browse and connect with people across the community.",
    icon: Users,
    minRole: "member",
    accent: "text-sky-500",
  },
  {
    id: "recorder",
    name: "Community Recorder",
    description:
      "Keep and manage public records. Including votes, community papers, and more.",
    icon: Archive,
    minRole: "member",
    accent: "text-emerald-500",
  },
  // {
  //   id: 'governance',
  //   name: 'Governance',
  //   description: 'Proposals, voting, and collective decision-making.',
  //   icon: Vote,
  //   minRole: 'member',
  //   accent: 'text-indigo-500',
  //   comingSoon: true,
  // },
  // {
  //   id: 'moderation',
  //   name: 'Moderation',
  //   description: 'Review reports and keep community spaces healthy.',
  //   icon: ShieldCheck,
  //   minRole: 'moderator',
  //   accent: 'text-primary',
  //   comingSoon: true,
  // },
  {
    id: "admin",
    name: "Admin Console",
    description: "Manage members, roles, and access across the OS.",
    icon: Settings2,
    minRole: "admin",
    accent: "text-orange-500",
    path: "/admin",
  },
]

/** Icon used for a module fallback / generic tool. */
export const GENERIC_MODULE_ICON: LucideIcon = Wrench
export const DASHBOARD_ICON: LucideIcon = LayoutDashboard
export const CHANGELOG_ICON: LucideIcon = ScrollText

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m): m is ModuleDef => !isDivider(m) && m.id === id)
}

/** Resolve the destination route for a module. */
export function moduleHref(mod: ModuleDef): string {
  return mod.path ?? `/m/${mod.id}`
}

/**
 * Return the module entries visible to a given role, keeping dividers but
 * dropping any that would end up leading, trailing, or doubled-up once
 * inaccessible modules are filtered out.
 */
export function accessibleEntries(
  role: Role | undefined | null,
): ModuleEntry[] {
  const out: ModuleEntry[] = []
  for (const entry of MODULES) {
    if (isDivider(entry)) {
      // Skip a divider unless it follows a real module.
      if (out.length > 0 && !isDivider(out[out.length - 1])) out.push(entry)
      continue
    }
    if (hasAtLeast(role, entry.minRole)) out.push(entry)
  }
  while (out.length > 0 && isDivider(out[out.length - 1])) out.pop()
  return out
}
