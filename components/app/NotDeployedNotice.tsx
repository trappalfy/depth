import { copy } from '@/content/copy.en'

/**
 * The one place the pre-mainnet situation is explained in prose. Blocked
 * buttons carry a one-line reason; this carries the why.
 */
export function NotDeployedNotice() {
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        <p className="text-[15px] font-semibold">{copy.app.notDeployed.heading}</p>
      </div>
      <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{copy.app.notDeployed.body}</p>
    </div>
  )
}
