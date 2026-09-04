/**
 * Release history shown on the Changelog page. Newest entry first.
 * Bump `brand.version` (src/config/brand.ts) alongside adding an entry here.
 */
export interface ChangelogEntry {
  version: string
  date: string
  highlights: string[]
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-09-04',
    highlights: [
      'Added the Consular Portal: a travel board for members’ upcoming trips and community-contributed travel tips.',
      'Guest visits now go through a visa application flow — any member can submit one, but only admins can approve or deny it.',
      'The sidebar version number now links to this changelog for moderators and admins.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-01',
    highlights: [
      'Initial release of Commons: phone-number sign-in with tiered role-based access control.',
      'Announcements, Events & Calendar (with RSVPs and calendar downloads), Member Directory, and Apps & Games.',
      'Community Recorder for official papers, votes, and policies.',
      'Admin Console for managing member roles and account status.',
    ],
  },
]
