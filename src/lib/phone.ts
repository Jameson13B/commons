/** Normalize user input to an E.164 phone number (best-effort, US default). */
export function toE164(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  if (trimmed.startsWith('+')) return `+${digits}`
  // Assume US/Canada if the caller omitted a country code.
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

/** Loose check that a string has enough digits to be a phone number. */
export function isLikelyPhone(raw: string): boolean {
  return raw.replace(/[^\d]/g, '').length >= 7
}
