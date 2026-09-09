import { PreviewMark } from '@/components/app/PreviewTag'
import { StatusPill } from '@/components/ui/StatusPill'
import { copy } from '@/content/copy.en'
import { ADAPTER_STATUS_LABEL, ADAPTER_STATUS_NOTE, type AdapterStatus } from '@/lib/adapterStatus'
import { STATUS_NOTE, type Status } from '@/lib/status'

/**
 * Both statuses, each labelled with where it came from.
 *
 * Until the adapter exists, the left card shows the state it *would* report,
 * decided by running its own rules against the live feed — the same rules
 * /board already runs. It is marked as a preview, and where those rules cannot
 * decide (a feed past its heartbeat has no member in the on-chain enum yet) the
 * card says so instead of picking one.
 */
export function StatusPanel({
  offchain,
  onchain,
  preview,
}: {
  offchain: Status
  onchain: AdapterStatus | null
  /** What the adapter would answer, when nothing is deployed to ask. */
  preview: AdapterStatus | null
}) {
  const shown = onchain ?? preview
  const isPreview = onchain === null && preview !== null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-fg-faint">{copy.app.detail.onchainStatus}</p>
          {isPreview && <PreviewMark />}
        </div>
        {shown ? (
          <>
            <p className="mt-3 text-[17px] font-semibold">{ADAPTER_STATUS_LABEL[shown]}</p>
            <p className="mt-2 text-[15px] text-fg-muted">{ADAPTER_STATUS_NOTE[shown]}</p>
            {isPreview && (
              <p className="mt-2 text-[12px] text-fg-faint">{copy.app.detail.previewStatusNote}</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-[15px] text-fg-muted">{copy.app.detail.unmappedStatus}</p>
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
