import { StatusPill } from '@/components/ui/StatusPill'
import { copy } from '@/content/copy.en'
import { ADAPTER_STATUS_LABEL, ADAPTER_STATUS_NOTE, type AdapterStatus } from '@/lib/adapterStatus'
import { STATUS_NOTE, type Status } from '@/lib/status'

/**
 * Both statuses, each labelled with where it came from. Before the adapter
 * exists only the off-chain one is real, and saying so is the point.
 */
export function StatusPanel({
  offchain,
  onchain,
}: {
  offchain: Status
  onchain: AdapterStatus | null
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
        <p className="text-[12px] text-fg-faint">{copy.app.detail.onchainStatus}</p>
        {onchain ? (
          <>
            <p className="mt-3 text-[17px] font-semibold">{ADAPTER_STATUS_LABEL[onchain]}</p>
            <p className="mt-2 text-[15px] text-fg-muted">{ADAPTER_STATUS_NOTE[onchain]}</p>
          </>
        ) : (
          <p className="mt-3 text-[15px] text-fg-muted">{copy.app.detail.unavailable}</p>
        )}
      </div>

      <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
        <p className="text-[12px] text-fg-faint">{copy.app.detail.offchainStatus}</p>
        <div className="mt-3">
          <StatusPill status={offchain} />
        </div>
        <p className="mt-3 text-[15px] text-fg-muted">{STATUS_NOTE[offchain]}</p>
        <p className="mt-2 text-[12px] text-fg-faint">{copy.app.detail.offchainNote}</p>
      </div>
    </div>
  )
}
