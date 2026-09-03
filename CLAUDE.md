# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Commons — "the operating system for our community." A private intranet SPA with
phone-number sign-in, tiered role-based access control, and a registry of
internal tools ("modules") plus links to external community apps. Built with
Vite + React 19 + TypeScript, Tailwind CSS v4, Firebase Auth (phone), and
Cloud Firestore. Deploys as a static SPA (Netlify is the default target;
Firebase Hosting and Surge are fallbacks — see `netlify.toml` / `firebase.json`).

## Commands

```bash
npm run dev              # start Vite dev server (http://localhost:5173)
npm run build             # tsc -b type-check, then vite build
npm run lint              # oxlint
npm run preview           # preview a production build locally
npm run build:surge       # build + copy dist/index.html to dist/200.html (Surge SPA routing)
npm run deploy:rules      # firebase deploy --only firestore:rules
npm run deploy:hosting    # build + firebase deploy --only hosting
npm run deploy            # build + firebase deploy
```

There is no test suite/framework configured in this repo.

Local setup requires a `.env.local` (copied from `.env.example`) with
`VITE_FIREBASE_*` values; without it, the app renders a "Finish setting up
Commons" screen (`src/features/setup/SetupRequired.tsx`) instead of the app
(see `src/lib/firebase.ts` / `src/main.tsx`).

## Architecture

**Path alias**: `@/*` maps to `src/*` (configured in both `vite.config.ts` and
`tsconfig.app.json`).

**Entry & auth gating** (`src/main.tsx`): if Firebase env vars are missing, the
whole app is replaced by `SetupRequired`. Otherwise `AuthProvider` wraps
`App` inside `BrowserRouter`.

**Auth/profile state** (`src/context/AuthProvider.tsx`): tracks the Firebase
`User` via `onAuthStateChanged`, and separately subscribes (realtime,
`onSnapshot`) to that user's profile document at `users/{uid}` in Firestore.
The two are distinct loading states (`loading` vs `profileLoading`) — a
signed-in user without a Firestore profile doc yet is mid-onboarding. Consumed
via the `useAuth()` hook (`src/hooks/useAuth.ts` / `src/context/auth-context.ts`).

**Route guards** (`src/App.tsx`, `src/components/guards/`):
- `RequireAuth` — redirects to `/login` if signed out, `/onboarding` if signed
  in but no profile doc exists yet, else renders `<Outlet/>`.
- `RequireRole minRole=".."` — nested inside `RequireAuth`; redirects to `/`
  if the profile's role doesn't meet `minRole`.

**Authorization model** (`src/config/roles.ts`): roles are a ranked tuple
`guest(0) < member(1) < moderator(2) < admin(3)`; checks are
`hasAtLeast(role, min)` (numeric comparison, not a hardcoded matrix). Account
lifecycle is separate from role: `pending | active | suspended`
(`AccountStatus`). New sign-ups always self-provision as `guest`/`pending`
(`DEFAULT_ROLE/DEFAULT_STATUS`); nothing client-side can escalate this —
`firestore.rules` enforces that a user's own `create`/`update` on their
`users/{uid}` doc can never set `role`/`status`, only an admin (or console
edit, for bootstrapping the first admin) can. This same rank model is
mirrored in the security rules (`isAdmin()`, `isModerator()`,
`isActiveMember()` helper functions).

**Modules registry** (`src/config/modules.tsx`): the internal tools/systems of
the OS (Announcements, Events, Apps & Games, Directory, Community Recorder,
Admin Console, plus `comingSoon` placeholders) are declared as data —
`id`, `name`, `icon`, `minRole`, optional `path` (defaults to `/m/:id`) — in
one `MODULES` array (interleaved with `{ divider: true }` separators). The
dashboard grid and sidebar both call `accessibleEntries(role)` to filter/render
this same list, so a module's visibility is a one-line `minRole` change, not
something implemented per-page. Routes for real modules are wired explicitly
in `src/App.tsx` (e.g. `/m/announcements` → `Announcements`); any module
without an explicit route falls through to the generic `/m/:moduleId` →
`ModulePage` placeholder.

**External apps registry** (`src/config/apps.ts`): a separate, simpler list
(`APPS`) of external community apps/games hosted on their own domains — cards
that open in a new tab from the "Apps & Games" module page. Adding one needs
no deploy beyond the frontend list entry.

**Data model** (`src/lib/types.ts`): Firestore documents —
`users/{uid}` (`UserProfile`), `announcements/{id}`, `events/{id}` with a
`rsvps/{uid}` subcollection (`EventRsvp`, doc ID = member uid), and
`records/{id}` (`CommunityRecord` — the "Community Recorder": papers, votes,
policies; has a `draft`/`published` `RecordStatus`, admin-managed, and
vote-only fields that are `null` for non-vote records).

**Firestore security rules** (`firestore.rules`) are the server-side source of
truth for the same access model — client-side role checks are UX only. Notably:
records queries must filter `where('status','==','published')` client-side for
non-admins, since drafts are only readable by admins at the rules level.

**UI primitives** (`src/components/ui/`): small Radix-based components
(dialog, dropdown-menu, select, label) styled with Tailwind, `clsx` +
`tailwind-merge` (`cn` helper likely in `src/lib/utils.ts`), and
`class-variance-authority` for variants (e.g. `badge.tsx` variant used by
`roleBadgeVariant()` in `src/lib/user.ts`). Layout chrome (shell, sidebar,
user menu, theme toggle, brand mark) lives in `src/components/layout/`.

**Rebranding**: product name/tagline is centralized in `src/config/brand.ts`;
color tokens live in `src/index.css`.

## Lint config

`oxlint` (`.oxlintrc.json`) enables `react`, `typescript`, and `oxc` plugins,
with `react/rules-of-hooks` as an error. TypeScript itself runs in strict-ish
mode with `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`
enabled (`tsconfig.app.json`) — `npm run build` will fail on these.
