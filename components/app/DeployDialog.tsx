'use client'

import { useEffect, useState } from 'react'
import type { Abi, Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { TxButton } from '@/components/app/TxButton'
import { Modal } from '@/components/ui/Modal'
import { StatusPill } from '@/components/ui/StatusPill'
import { useBlockedReason, useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'
import { ADAPTER_PARAMS } from '@/lib/adapterParams'
import { previewAnswer } from '@/lib/adapterPreview'
import { formatAge, formatPrice } from '@/lib/format'
import type { FeedRow } from '@/lib/snapshot'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/** A row of the dialog: label on the left, value in mono on the right. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.06] py-2.5 first:border-t-0">
      <span className="shrink-0 text-[12px] text-fg-faint">{label}</span>
      <span className="min-w-0 break-all text-right font-mono text-[12px]">{children}</span>
    </div>
  )
}

function CopyableAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <button
      type="button"
      title={copy.app.deploy.copy}
      onClick={() => {
        // Clipboard access is refused outside a secure context and in some
        // embeddings; a failed copy must not take the dialog down with it.
        navigator.clipboard?.writeText(value).then(
          () => setCopied(true),
          () => setCopied(false),
        )
      }}
      className="font-mono text-[12px] text-fg-muted transition-colors hover:text-white"
    >
      {copied ? copy.app.deploy.copied : value}
    </button>
  )
}

/**
 * The deploy form: everything the transaction will contain, before it is sent.
 *
 * Deploying is permissionless and takes exactly two arguments, so there is
 * nothing here to configure — which is the point worth showing. What the dialog
 * does instead is state what the caller is committing to: the pair being
 * wrapped, the parameters baked into the adapter, the address it will land at,
 * and what it would answer the moment it exists.
 */
export function DeployDialog({ row, onClose }: { row: FeedRow; onClose: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false)
  const { state, params } = useDeployment()
  const chainBlockedReason = useBlockedReason(state)
  const factory = state.kind === 'live' ? state.factory : undefined

  // The address is fixed by CREATE2 before anyone presses anything — but only
  // the factory can derive it, so before it exists there is nothing to show.
  const addressRead = useReadContracts({
    allowFailure: true,
    contracts: factory
      ? ([
          {
            address: factory,
            abi: adapterFactoryAbi,
            functionName: 'computeAddress',
            args: [row.token, row.feed],
          },
        ] as const)
      : [],
    query: { enabled: Boolean(factory) },
  })

  const addressEntry = addressRead.data?.[0]
  const willDeployTo =
    addressEntry && addressEntry.status === 'success' ? (addressEntry.result as Address) : null

  const shownParams = state.kind === 'live' && params ? params : ADAPTER_PARAMS
  const answer = previewAnswer(row.status, BigInt(row.price))

  // The acknowledgement is the caller's own gate, so it is reported before any
  // chain condition: it is the one the reader can clear from this dialog.
  const blockedReason = !acknowledged ? copy.app.deploy.mustAcknowledge : chainBlockedReason

  return (
    <Modal
      title={`${copy.app.deploy.title} · ${row.symbol}`}
      onClose={onClose}
      widthClassName="max-w-[520px]"
    >
      <p className="mt-4 text-[15px] text-fg-muted">{copy.app.deploy.lede}</p>

      <div className="mt-5">
        <p className="text-[12px] text-fg-faint">{copy.app.deploy.wrapsHeading}</p>
        <div className="mt-2 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 px-4 py-1">
          <Field label={copy.app.deploy.token}>
            <CopyableAddress value={row.token} />
          </Field>
          <Field label={copy.app.deploy.feed}>
            <CopyableAddress value={row.feed} />
          </Field>
          <Field label={copy.app.deploy.address}>
            {willDeployTo ? (
              <CopyableAddress value={willDeployTo} />
            ) : (
              <span className="font-sans text-[12px] text-fg-muted">
                {copy.app.deploy.addressPending}
              </span>
            )}
          </Field>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12px] text-fg-faint">
          {state.kind === 'live'
            ? copy.app.deploy.paramsHeading
            : copy.app.deploy.paramsHeadingIntended}
        </p>
        <div className="mt-2 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 px-4 py-1">
          <Field label={copy.app.list.paramQuiet}>{formatAge(Number(shownParams.quietAfter))}</Field>
          <Field label={copy.app.list.paramBudget}>
            {formatAge(Number(shownParams.protectionBudget))}
          </Field>
          <Field label={copy.app.list.paramContinuity}>{shownParams.continuityBps} bps</Field>
          <Field label={copy.app.list.paramSequencer}>
            {shownParams.sequencerFeed === ZERO_ADDRESS ? (
              <span className="font-sans text-[12px] text-fg-muted">
                {copy.app.list.sequencerDisabled}
              </span>
            ) : (
              shownParams.sequencerFeed
            )}
          </Field>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12px] text-fg-faint">{copy.app.deploy.answerHeading}</p>
        <div className="mt-2 flex items-center gap-3 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 px-4 py-3">
          <StatusPill status={row.status} />
          <span className="font-mono text-[17px] tabular-nums">
            {answer !== null ? `$${formatPrice(answer, row.priceDecimals)}` : '—'}
          </span>
          <span className="text-[12px] text-fg-faint">
            {answer !== null ? copy.app.deploy.answerPassthrough : copy.app.deploy.answerHeld}
          </span>
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13px] text-fg-muted">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-white"
        />
        {copy.app.deploy.acknowledge}
      </label>

      <div className="mt-5 flex items-start gap-4">
        <TxButton
          label={copy.app.deploy.confirm}
          variant="primary"
          blockedReason={blockedReason}
          onSuccess={onClose}
          request={
            state.kind === 'live' && acknowledged
              ? {
                  address: state.factory,
                  abi: adapterFactoryAbi as unknown as Abi,
                  functionName: 'deploy',
                  args: [row.token, row.feed],
                }
              : null
          }
        />
        <button
          type="button"
          onClick={onClose}
          className="flex h-[38px] items-center text-[15px] text-fg-muted transition-colors hover:text-white"
        >
          {copy.app.deploy.cancel}
        </button>
      </div>

      <p className="mt-5 text-[12px] text-fg-faint">{copy.app.deploy.gasNote}</p>
    </Modal>
  )
}
