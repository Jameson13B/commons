import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { brand } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { BrandMark } from '@/components/layout/BrandMark'

/** Normalize user input to an E.164 phone number (best-effort, US default). */
function toE164(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  if (trimmed.startsWith('+')) return `+${digits}`
  // Assume US/Canada if the caller omitted a country code.
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

/** Turn a Firebase auth error into an actionable, human-friendly message. */
function describeAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : ''
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'That phone number looks invalid. Use full international format, e.g. +16505551234.'
    case 'auth/missing-phone-number':
      return 'Please enter a phone number.'
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for this project. Try again later or use a test number.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a bit and try again.'
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'reCAPTCHA/app verification failed. Make sure this domain is in Firebase Authentication > Settings > Authorized domains.'
    case 'auth/operation-not-allowed':
      return 'SMS blocked for this region. Either add this number under Authentication > Sign-in method > Phone > "Phone numbers for testing", or allow the region in Authentication > Settings > SMS region policy.'
    case 'auth/billing-not-enabled':
      return 'Phone auth requires billing (Blaze plan) enabled on the Firebase project.'
    default:
      return `We could not send a code to that number. (${code || 'unknown error'}) Check the browser console for details.`
  }
}

type Step = 'phone' | 'code'

export function PhoneLogin() {
  const { user, profile, loading } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const verifierRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaWrapperRef = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)

  // Lazily create the invisible reCAPTCHA verifier. Each verifier renders into a
  // brand-new child element so a stale widget from a previous attempt can never
  // trigger "reCAPTCHA has already been rendered in this element".
  function getVerifier(): RecaptchaVerifier {
    if (!verifierRef.current) {
      const wrapper = recaptchaWrapperRef.current
      if (!wrapper) throw new Error('reCAPTCHA container is not ready yet.')
      const host = document.createElement('div')
      wrapper.appendChild(host)
      verifierRef.current = new RecaptchaVerifier(auth, host, {
        size: 'invisible',
      })
    }
    return verifierRef.current
  }

  function resetVerifier() {
    try {
      verifierRef.current?.clear()
    } catch {
      // Ignore: the widget may already be gone.
    }
    verifierRef.current = null
    if (recaptchaWrapperRef.current) recaptchaWrapperRef.current.innerHTML = ''
  }

  // Clean up the verifier when the component unmounts.
  useEffect(() => {
    return () => resetVerifier()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return null
  // Already signed in: route onward based on whether a profile exists.
  if (user) {
    return <Navigate to={profile ? '/' : '/onboarding'} replace />
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isFirebaseConfigured) {
      setError('Firebase is not configured yet. Add your keys to .env.local.')
      return
    }
    setSubmitting(true)
    try {
      const e164 = toE164(phone)
      const verifier = getVerifier()
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, verifier)
      setStep('code')
    } catch (err) {
      console.error(err)
      setError(describeAuthError(err))
      // Reset so the next attempt starts with a fresh reCAPTCHA.
      resetVerifier()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const confirmation = confirmationRef.current
    if (!confirmation) {
      setError('Your session expired. Please request a new code.')
      setStep('phone')
      return
    }
    setSubmitting(true)
    try {
      await confirmation.confirm(code.trim())
      // onAuthStateChanged in AuthProvider takes over from here.
    } catch (err) {
      console.error(err)
      setError('That code was incorrect or expired. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(60rem 40rem at 50% -10%, color-mix(in oklch, var(--color-primary) 22%, transparent), transparent 70%)',
        }}
      />
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to {brand.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{brand.tagline}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+1 555 123 4567"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll text you a one-time code. Standard message rates may apply.
                </p>
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner /> : null}
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setCode('')
                  setError(null)
                }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Use a different number
              </button>

              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="text-center text-lg tracking-[0.5em]"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Sent to {toE164(phone)}.
                </p>
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner /> : null}
                Verify & continue
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Secured with phone verification
        </p>
      </div>

      {/* Invisible reCAPTCHA renders into a fresh child of this wrapper. */}
      <div ref={recaptchaWrapperRef} />
    </div>
  )
}
