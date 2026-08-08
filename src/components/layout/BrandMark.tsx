import { Hexagon } from 'lucide-react'
import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'

/** The Commons logo: a mark plus optional wordmark. */
export function BrandMark({
  className,
  showName = false,
  size = 'md',
}: {
  className?: string
  showName?: boolean
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'size-8' : 'size-11'
  const icon = size === 'sm' ? 'size-4' : 'size-6'
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm',
          box,
        )}
      >
        <Hexagon className={cn(icon)} strokeWidth={2.25} />
      </div>
      {showName ? (
        <span className="text-lg font-semibold tracking-tight">
          {brand.name}
        </span>
      ) : null}
    </div>
  )
}
