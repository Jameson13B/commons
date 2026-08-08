import { AlertTriangle } from 'lucide-react'
import { missingKeys } from '@/lib/firebase'
import { brand } from '@/config/brand'
import { BrandMark } from '@/components/layout/BrandMark'

/** Shown when Firebase env vars are missing, with setup guidance. */
export function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Finish setting up {brand.name}
          </h1>
        </div>

        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
            <div className="space-y-3 text-sm">
              <p className="font-medium text-foreground">
                Firebase isn't configured yet.
              </p>
              <p className="text-muted-foreground">
                Copy <code className="rounded bg-muted px-1.5 py-0.5">.env.example</code>{' '}
                to <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code>{' '}
                and paste your Firebase web config, then restart{' '}
                <code className="rounded bg-muted px-1.5 py-0.5">npm run dev</code>.
              </p>
              {missingKeys.length ? (
                <div className="text-muted-foreground">
                  <p className="mb-1">Missing values:</p>
                  <ul className="list-inside list-disc font-mono text-xs">
                    {missingKeys.map((key) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
