'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { Calculator } from '@/components/app/Calculator'
import { CommitButton } from '@/components/app/CommitButton'
import { IntegrationSnippet } from '@/components/app/IntegrationSnippet'
import { NotDeployedNotice } from '@/components/app/NotDeployedNotice'
import { StatNumber, StatUnavailable } from '@/components/app/PriceNumbers'
import { StatusPanel } from '@/components/app/StatusPanel'
import { useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi, stockOracleAdapterAbi } from '@/lib/adapterAbi'
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

      <h1 className="mt-10 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
        {row.symbol}
        <span className="ml-3 text-[17px] font-normal text-fg-muted">{row.name}</span>
      </h1>

      <p className="mt-6 break-all font-mono text-[12px] text-fg-faint">
        token {row.token} · feed {row.feed}
        {adapter ? ` · adapter ${adapter}` : ''}
      </p>

      {state.kind !== 'live' && (
        <div className="mt-10">
          <NotDeployedNotice />
        </div>
      )}

      <div className="mt-10">
        <StatusPanel offchain={row.status} onchain={onchainStatus} />
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
            value={`$${formatPrice(held, row.priceDecimals)}`}
            delta={delta ?? undefined}
            note={copy.app.detail.heldPriceNote}
          />
        ) : (
          <StatUnavailable label={copy.app.detail.heldPrice} reason={copy.app.detail.unavailable} />
        )}

        {endsAt !== null ? (
          <StatNumber
            label={copy.app.detail.budget}
            value={formatAge(Math.max(0, endsAt - now))}
            note={copy.app.detail.budgetNote}
          />
        ) : (
          <StatUnavailable label={copy.app.detail.budget} reason={copy.app.detail.unavailable} />
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
        {committedAt !== null && (
          <p className="mb-4 text-[12px] text-fg-faint">
            {copy.app.detail.committedAt}: {formatAge(Math.max(0, now - committedAt))}
          </p>
        )}
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
