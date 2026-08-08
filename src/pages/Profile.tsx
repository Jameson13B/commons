import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS, STATUS_LABELS } from '@/config/roles'
import { initials, roleBadgeVariant } from '@/lib/user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

export function Profile() {
  const { profile, updateDisplayName, signOut } = useAuth()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null

  const dirty = name.trim() !== profile.displayName && name.trim().length >= 2

  async function handleSave() {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await updateDisplayName(name)
      setSaved(true)
    } catch (err) {
      console.error(err)
      setError('Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Profile & settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage how you appear in the community.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials(profile.displayName)}
          </span>
          <div className="space-y-1">
            <CardTitle>{profile.displayName}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant={roleBadgeVariant(profile.role)}>
                {ROLE_LABELS[profile.role]}
              </Badge>
              <Badge variant="outline">{STATUS_LABELS[profile.status]}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>
            Your role and access level are managed by community administrators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSaved(false)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={profile.phoneNumber ?? 'Not available'}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Your phone number is used for sign-in and can't be changed here.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {saved ? (
            <p className="text-sm text-success">Changes saved.</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Spinner /> : null}
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base">Sign out</CardTitle>
          <CardDescription>
            End your session on this device.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut /> Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
