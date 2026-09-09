'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { DeployButton } from '@/components/app/DeployButton'
import { NotDeployedNotice } from '@/components/app/NotDeployedNotice'
import { StatusPill } from '@/components/ui/StatusPill'
import { useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'
import { formatAge, shortAddress } from '@/lib/format'
import type { Snapshot } from '@/lib/snapshot'

/** Two reads per asset: the deterministic address, and whether it exists yet. */
const CALLS_PER_ROW = 2

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function AdapterList({ initial }: { initial: Snapshot }) {
  const [now, setNow] = useState(initial.observedAt)
  const { state, params } = useDeployment()
  const factory = state.kind === 'live' ? state.factory : undefined
  const rows = initial.rows

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tick)
  }, [])

  const adapters = useReadContracts({
    allowFailure: true,
    contracts: factory
      ? rows.flatMap((row) => [
          {
            address: factory,
            abi: adapterFactoryAbi,
            functionName: 'computeAddress',
            args: [row.token, row.feed],
          } as const,
          {
            address: factory,
            abi: adapterFactoryAbi,
            functionName: 'isDeployed',
            args: [row.token, row.feed],
          } as const,
        ])
      : [],
    query: { enabled: Boolean(factory) },
  })

  const adapterAt = (index: number): { address: Address; deployed: boolean } | null => {
    const results = adapters.data
    if (!results) return null
    const address = results[index * CALLS_PER_ROW]
    const deployed = results[index * CALLS_PER_ROW + 1]
    if (!address || address.status !== 'success') return null
    if (!deployed || deployed.status !== 'success') return null
    return { address: address.result as Address, deployed: deployed.result as boolean }
  }

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
        {copy.app.list.heading}
      </h1>
      <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{copy.app.list.lede}</p>

      {state.kind !== 'live' && (
        <div className="mt-10">
          <NotDeployedNotice />
        </div>
      )}

      {/* The factory IS the canonical parameter set, so the console reads these
          off chain rather than keeping a second copy that could drift. */}
      {state.kind === 'live' && params && (
        <p className="mt-10 text-[12px] text-fg-faint">
          {copy.app.list.factoryLabel} <span className="font-mono">{state.factory}</span> ·{' '}
          {copy.app.list.paramQuiet} {formatAge(Number(params.quietAfter))} ·{' '}
          {copy.app.list.paramBudget} {formatAge(Number(params.protectionBudget))} ·{' '}
          {copy.app.list.paramContinuity} {params.continuityBps} bps ·{' '}
          {copy.app.list.paramSequencer}{' '}
          {params.sequencerFeed === ZERO_ADDRESS
            ? copy.app.list.sequencerDisabled
            : shortAddress(params.sequencerFeed)}
        </p>
      )}

      <p className="mt-10 text-[12px] text-fg-faint">
        Read from Robinhood Chain mainnet (chain {initial.chainId}) at block{' '}
        <span className="font-mono">{initial.blockNumber}</span>,{' '}
        {formatAge(Math.max(0, now - initial.observedAt))} ago.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="text-[12px] text-fg-faint">
              <th className="pb-3 font-normal">{copy.app.list.columns.ticker}</th>
              <th className="pb-3 font-normal">{copy.app.list.columns.offchain}</th>
              <th className="pb-3 font-normal">{copy.app.list.columns.age}</th>
              <th className="pb-3 font-normal">{copy.app.list.columns.adapter}</th>
              <th className="pb-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const adapter = adapterAt(index)
              return (
                <tr key={row.symbol} className="border-t border-white/[0.06]">
                  <td className="py-3">
                    <Link href={`/app/${row.symbol}`} className="font-semibold hover:underline">
                      {row.symbol}
                    </Link>
                    <span className="ml-2 text-[12px] text-fg-faint">{row.name}</span>
                  </td>
                  <td className="py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="py-3 font-mono text-[13px] tabular-nums text-fg-muted">
                    {formatAge(Math.max(0, now - row.updatedAt))}
                  </td>
                  <td className="py-3 font-mono text-[12px] text-fg-faint">
                    {adapter ? (
                      <>
                        {shortAddress(adapter.address)}
                        {adapter.deployed && (
                          <span className="ml-2 font-sans text-[12px] text-fg-muted">
                            {copy.app.list.deployed}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-sans">{copy.app.list.addressPending}</span>
                    )}
                  </td>
                  <td className="py-3">
                    {adapter?.deployed ? (
                      <Link
                        href={`/app/${row.symbol}`}
                        className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
                      >
                        {copy.app.list.openDetail}
                      </Link>
                    ) : (
                      <DeployButton token={row.token} feed={row.feed} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
