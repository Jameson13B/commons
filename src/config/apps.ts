import {
  Dices,
  KeyRound,
  ListChecks,
  Rocket,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/config/roles"

/**
 * External community apps and games surfaced in the Apps & Games launcher.
 * These live on their own domains; cards link out in a new tab. To add one,
 * append an entry here -- no deploy of anything but the frontend is needed.
 */
export interface AppLink {
  id: string
  name: string
  description: string
  /** Full URL, opened in a new tab. */
  url: string
  icon: LucideIcon
  /** Tailwind text color class for the icon accent. */
  accent?: string
  /** Minimum role required to launch. Defaults to `member`. */
  minRole?: Role
}

export const APPS: AppLink[] = [
  {
    id: "logins",
    name: "Logins",
    description: "Stores community-shared credentials.",
    url: "https://logins.jamesonb.com",
    icon: KeyRound,
    accent: "text-amber-500",
  },
  {
    id: "scorekeeper",
    name: "Scorekeeper",
    description: "Keep score while playing games.",
    url: "https://scorekeeper.jamesonb.com",
    icon: ListChecks,
    accent: "text-violet-500",
  },
  {
    id: "starstruck",
    name: "Starstruck by Barely Fiction",
    description: "Alliances. Betrayals. Shocking eliminations.",
    url: "https://starstruck.barelyfiction.design",
    icon: Rocket,
    accent: "text-teal-500",
  },
  {
    id: "vault",
    name: "Vault",
    description: "A game paired with dice.",
    url: "https://vault.neonfiction.games",
    icon: Dices,
    accent: "text-sky-500",
  },
  {
    id: "pocket",
    name: "Pocket",
    description: "Wallet app for board games.",
    url: "https://pocket.atomic10.studio",
    icon: Wallet,
    accent: "text-emerald-500",
  },
]

/** Pretty hostname for display, e.g. "pocket.atomic10.studio". */
export function appHost(app: AppLink): string {
  try {
    return new URL(app.url).host
  } catch {
    return app.url
  }
}
