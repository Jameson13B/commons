/**
 * Central brand configuration.
 *
 * This is the single source of truth for the product's name and tagline.
 * Rename the community here and it propagates across the whole app.
 * Visual tokens (colors, fonts, radius) live in `src/index.css`.
 */
export const brand = {
  name: "Commons",
  shortName: "Commons",
  tagline: "The operating system for our future community",
  description:
    "A private intranet where members access the tools and systems that run our community.",
  version: "0.2.0",
} as const
