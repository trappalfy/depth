'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { Calculator } from '@/components/app/Calculator'
import { CommitButton } from '@/components/app/CommitButton'
import { IntegrationSnippet } from '@/components/app/IntegrationSnippet'
import { PreviewBadge } from '@/components/app/PreviewTag'
import { StatNumber, StatUnavailable } from '@/components/app/PriceNumbers'
import { StatusPanel } from '@/components/app/StatusPanel'
import { useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi, stockOracleAdapterAbi } from '@/lib/adapterAbi'
import { ADAPTER_PARAMS } from '@/lib/adapterParams'
import {
  previewAdapterStatus,
  previewAnswer,
  previewBudgetRemaining,
} from '@/lib/adapterPreview'
import { adapterStatusFromEnum } from '@/lib/adapterStatus'
import { formatAge, formatMultiplier, formatPrice, heartbeatFraction } from '@/lib/format'
import type { FeedRow } from '@/lib/snapshot'

export function AdapterDetail({ row, observedAt }: { row: FeedRow; observedAt: number }) {
  const [now, setNow] = useState(observedAt)
  const { state } = useDeployment()
  const factory = state.kind === 'live' ? state.factory : undefined

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tick)
  }, [])

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
  const adapter =
    addressEntry && addressEntry.status === 'success' ? (addressEntry.result as Address) : null

  const adapterRead = useReadContracts({
    allowFailure: true,
    contracts: adapter
      ? ([
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'status' },
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'heldAnswer' },
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'protectionEndsAt' },
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'committedAt' },
        ] as const)
      : [],
    query: { enabled: Boolean(adapter) },
  })

  const valueAt = (index: number): unknown => {
    const entry = adapterRead.data?.[index]
    return entry && entry.status === 'success' ? entry.result : undefined
  }

  const rawStatus = valueAt(0)
  const rawHeld = valueAt(1)
  const rawEndsAt = valueAt(2)
  const rawCommittedAt = valueAt(3)

  const onchainStatus = typeof rawStatus === 'number' ? adapterStatusFromEnum(rawStatus) : null
  const held = typeof rawHeld === 'bigint' ? rawHeld : null
  const endsAt = typeof rawEndsAt === 'bigint' ? Number(rawEndsAt) : null
  const committedAt = typeof rawCommittedAt === 'bigint' ? Number(rawCommittedAt) : null

  const live = BigInt(row.price)
  const age = Math.max(0, now - row.updatedAt)

  // Until a contract can be asked, run its own rules against the live feed —
  // the same rules /board runs. Each of these is null wherever the rules cannot
  // decide without the adapter's committed snapshot, and the card then says so.
  const deployed = adapter !== null
  const previewStatus = deployed ? null : previewAdapterStatus(row.status)
  const previewPrice = deployed ? null : previewAnswer(row.status, live)
  const previewBudget = deployed
    ? null
    : previewBudgetRemaining(row.status, ADAPTER_PARAMS.protectionBudget)

  // Percent difference between live and held, to two decimals, signed.
  const delta =
    held !== null && held !== 0n
      ? (() => {
          const bps = ((live - held) * 10_000n) / held
          const sign = bps >= 0n ? '+' : '-'
          const abs = bps < 0n ? -bps : bps
          return `${sign}${(Number(abs) / 100).toFixed(2)}% against the held price`
        })()
      : null

  return (
    <div>
      <Link href="/app" className="text-[15px] text-fg-muted hover:text-white">
        {copy.app.detail.backLabel}
      </Link>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
          {row.symbol}
          <span className="ml-3 text-[17px] font-normal text-fg-muted">{row.name}</span>
        </h1>
        {state.kind !== 'live' && <PreviewBadge />}
      </div>

      <p className="mt-6 break-all font-mono text-[12px] text-fg-faint">
        token {row.token} · feed {row.feed} ·{' '}
        {adapter ? `adapter ${adapter}` : copy.app.detail.adapterPending}
      </p>

      <div className="mt-10">
        <StatusPanel offchain={row.status} onchain={onchainStatus} preview={previewStatus} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StatNumber
          label={copy.app.detail.livePrice}
          value={`$${formatPrice(live, row.priceDecimals)}`}
          fraction={heartbeatFraction(age, row.heartbeat)}
          source={`${copy.app.detail.livePriceSource} · ${formatAge(age)} old of a ${formatAge(
            row.heartbeat,
          )} heartbeat`}
        />

        {held !== null ? (
          <StatNumber
            label={copy.app.detail.heldPrice}
            value={`${formatPrice(held, row.priceDecimals)}`}
            delta={delta ?? undefined}
            note={copy.app.detail.heldPriceNote}
          />
        ) : previewPrice !== null ? (
          // Nothing is being held: in this state the adapter passes the feed's
          // own number through, so the number it would answer with is on screen
          // already. It is the same figure, and saying which is which matters.
          <StatNumber
            label={copy.app.detail.answerLabel}
            value={`$${formatPrice(previewPrice, row.priceDecimals)}`}
            note={copy.app.detail.passthroughNote}
            preview
          />
        ) : (
          <StatUnavailable label={copy.app.detail.heldPrice} reason={copy.app.detail.heldUnknown} />
        )}

        {endsAt !== null ? (
          <StatNumber
            label={copy.app.detail.budget}
            value={formatAge(Math.max(0, endsAt - now))}
            note={copy.app.detail.budgetNote}
          />
        ) : previewBudget !== null ? (
          // Full, because nothing has opened a protection window. The budget is
          // only consumed while a price is being held.
          <StatNumber
            label={copy.app.detail.budget}
            value={formatAge(Number(previewBudget))}
            note={copy.app.detail.budgetPreviewNote}
            preview
          />
        ) : (
          <StatUnavailable label={copy.app.detail.budget} reason={copy.app.detail.budgetUnknown} />
        )}

        <StatNumber
          label={copy.app.detail.multiplier}
          value={formatMultiplier(BigInt(row.uiMultiplier))}
          note={`${copy.app.detail.stagedMultiplier}: ${formatMultiplier(
            BigInt(row.newUIMultiplier),
          )}. ${copy.app.detail.multiplierNote}`}
        />
      </div>

      <div className="mt-10">
        <p className="mb-4 text-[12px] text-fg-faint">
          {committedAt !== null
            ? `${copy.app.detail.committedAt}: ${formatAge(Math.max(0, now - committedAt))}`
            : copy.app.detail.noSnapshot}
        </p>
        <CommitButton adapter={adapter} />
      </div>

      <div className="mt-16">
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
          {copy.app.detail.calculatorHeading}
        </h2>
        <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">
          {copy.app.detail.calculatorLede}
        </p>
        <div className="mt-8">
          {/* The route already decided the asset, so the selector is locked:
              wandering to another ticker here would leave the adapter open. */}
          <Calculator rows={[row]} initialSymbol={row.symbol} locked />
        </div>
      </div>

      <div className="mt-16">
        <IntegrationSnippet feed={row.feed} adapter={adapter} />
      </div>
    </div>
  )
}
