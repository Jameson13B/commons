# Commons

The operating system for our community — a private intranet with phone-number
sign-in, tiered access control, and an extensible registry of tools ("systems").
It starts digital-only and is architected to grow into the community's core OS.

Built with **Vite + React + TypeScript**, **Tailwind CSS v4**, **Firebase Auth
(phone)**, and **Cloud Firestore**.

> **Working name:** "Commons". To rebrand, edit [`src/config/brand.ts`](src/config/brand.ts)
> (name + tagline) and the color tokens in [`src/index.css`](src/index.css).

---

## Features

- Phone-number authentication (SMS one-time code) with invisible reCAPTCHA.
- New members onboard with a display name; profiles live in Firestore.
- Tiered authorization: **Guest → Member → Moderator → Admin**.
- Role-gated dashboard: members only see the tools their role unlocks.
- Admin console to approve pending sign-ups and assign roles.
- Pending / suspended account states with friendly messaging.
- Light & dark mode, consistent design system, responsive layout.
- Firestore security rules enforcing the same access model server-side.

---

## Prerequisites

- Node.js 20+ (built and tested on Node 22).
- A Firebase project (you said you already have one).

---

## 1. Configure Firebase

### a. Get your web config

Firebase console → **Project settings** (gear icon) → **General** → scroll to
**Your apps** → select/create a **Web app** → copy the `firebaseConfig` values.

Then create your local env file:

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the values from the console:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> If these are missing, the app shows a "Finish setting up Commons" screen
> instead of crashing. Restart `npm run dev` after editing `.env.local`.

### b. Enable Phone sign-in

Firebase console → **Authentication** → **Sign-in method** → enable **Phone**.

- Under **Settings → Authorized domains**, make sure `localhost` is listed (it is
  by default) and add your production domain when you deploy.
- **Local testing without real SMS:** in the Phone provider settings, expand
  **Phone numbers for testing** and add a number + fixed code (e.g.
  `+1 555 000 1234` → `123456`). Use those in the app to sign in without a real
  text.

### c. Create the Firestore database

Firebase console → **Firestore Database** → **Create database** (start in
production mode; the included rules handle access).

---

## 2. Run locally

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173).

---

## 3. Seed the first admin

For safety, everyone who signs up starts as a **guest / pending** — the security
rules forbid self-promotion. Promote yourself once, manually:

1. Sign in through the app with your phone number and finish onboarding.
2. Firebase console → **Firestore Database** → `users` collection → open the
   document whose `phoneNumber` matches yours (the doc ID is your `uid`).
3. Edit two fields:
   - `role` → `admin`
   - `status` → `active`
4. Refresh the app — the **Admin Console** appears in the sidebar. From there you
   can approve everyone else and assign roles in-app (no more console edits).

---

## 4. Deploy the security rules

The repo includes [`firestore.rules`](firestore.rules). Deploy them with the
Firebase CLI (`npm i -g firebase-tools`, then `firebase login`):

```bash
firebase use your-project-id       # or: firebase use --add
firebase deploy --only firestore:rules
```

---

## 5. Deploy the site

The app is a static SPA that builds to `dist/`. **Netlify is the default target.**

### Netlify (default)

[`netlify.toml`](netlify.toml) sets the build command, publish dir, and SPA
redirect. Either connect the repo in the Netlify UI, or use the CLI:

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

Add your `VITE_FIREBASE_*` values as **environment variables** in Netlify
(Site settings → Environment variables), and add the Netlify domain to Firebase
**Authorized domains**.

### Firebase Hosting (fallback)

[`firebase.json`](firebase.json) is preconfigured with a SPA rewrite:

```bash
npm run build
firebase deploy --only hosting
```

### Surge (fallback)

Surge needs a `200.html` for client-side routing — the `build:surge` script
creates it:

```bash
npm i -g surge
npm run build:surge
surge dist
```

---

## Project structure

```
src/
  components/
    guards/        RequireAuth, RequireRole route guards
    layout/        AppShell, BrandMark, UserMenu, ThemeToggle
    ui/            Reusable design-system primitives (button, card, ...)
  config/
    brand.ts       Product name + tagline (rebrand here)
    roles.ts       Role tiers, status, hasAtLeast() helper
    modules.tsx    Registry of community tools/systems (add tools here)
  context/         AuthProvider + auth context
  features/
    auth/          PhoneLogin, Onboarding
    setup/         SetupRequired (shown when env is missing)
  hooks/           useAuth
  lib/             firebase.ts, types.ts, utils.ts, user.ts
  pages/           Dashboard, Admin, Profile, ModulePage, NotFound
firestore.rules    Server-side access control
firebase.json      Firestore + Hosting config
netlify.toml       Default deploy config
```

---

## Authorization model

Roles are ranked numerically so checks are simple (`hasAtLeast(role, min)`):

| Role      | Rank | Typical access                        |
| --------- | ---- | ------------------------------------- |
| Guest     | 0    | Pending approval, no tools            |
| Member    | 1    | Standard community tools              |
| Moderator | 2    | Member tools + moderation             |
| Admin     | 3    | Everything, including the Admin Console |

Each entry in [`src/config/modules.tsx`](src/config/modules.tsx) declares a
`minRole`. The dashboard, sidebar, and route guard all respect it — so adding a
new tool and its access level is a one-line change.

## Adding a new system/tool

1. Add an entry to `MODULES` in [`src/config/modules.tsx`](src/config/modules.tsx)
   with an `id`, `name`, `description`, `icon`, and `minRole`.
2. It appears automatically on the dashboard and sidebar for eligible roles and
   routes to `/m/:id` (a scaffolded placeholder). Replace the placeholder by
   adding a real route/page when the tool is ready.
