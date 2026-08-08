import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { brand } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { BrandMark } from '@/components/layout/BrandMark'

/** Collects a display name for a freshly authenticated user, then creates their profile. */
export function Onboarding() {
  const { user, profile, loading, profileLoading, createProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  // Profile already exists -> nothing to onboard.
  if (!profileLoading && profile) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters).')
      return
    }
    setSubmitting(true)
    try {
      await createProfile(name)
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Something went wrong creating your profile. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Set up your profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome to {brand.name}. What should we call you?
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              autoFocus
              autoComplete="name"
              placeholder="Jordan Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              This is how other members will see you.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}
