'use client'

import { useEffect, useState } from 'react'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatAge, formatMultiplier, formatPrice, shortAddress } from '@/lib/format'
import type { Snapshot } from '@/lib/snapshot'

export function BoardTable({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [now, setNow] = useState(initial.observedAt)

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/feeds')
        if (res.ok) setSnapshot(await res.json())
      } catch {
        // Leave the last good snapshot on screen; the observation time below
        // makes the staleness visible without inventing a number.
      }
    }, 60_000)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [])

  return (
    <div>
      <p className="text-[12px] text-fg-faint">
        Read from Robinhood Chain mainnet (chain {snapshot.chainId}) at block{' '}
        <span className="font-mono">{snapshot.blockNumber}</span>,{' '}
        {formatAge(Math.max(0, now - snapshot.observedAt))} ago.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="text-[12px] text-fg-faint">
              <th className="pb-3 font-normal">Ticker</th>
              <th className="pb-3 font-normal">Price</th>
              <th className="pb-3 font-normal">Age</th>
              <th className="pb-3 font-normal">Multiplier</th>
              <th className="pb-3 font-normal">Oracle paused</th>
              <th className="pb-3 font-normal">Token paused</th>
              <th className="pb-3 font-normal">Status</th>
              <th className="pb-3 font-normal">Token</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.map((row) => (
              <tr key={row.symbol} className="border-t border-white/[0.06]">
                <td className="py-3">
                  <span className="font-semibold">{row.symbol}</span>
                  <span className="ml-2 text-[12px] text-fg-faint">{row.name}</span>
                </td>
                <td className="py-3 font-mono text-[13px] tabular-nums">
                  ${formatPrice(BigInt(row.price), row.priceDecimals)}
                </td>
                <td className="py-3 font-mono text-[13px] tabular-nums text-fg-muted">
                  {formatAge(Math.max(0, now - row.updatedAt))}
                </td>
                <td className="py-3 font-mono text-[13px] tabular-nums text-fg-muted">
                  {formatMultiplier(BigInt(row.uiMultiplier))}
                </td>
                <td className="py-3 text-[13px] text-fg-muted">{row.oraclePaused ? 'yes' : 'no'}</td>
                <td className="py-3 text-[13px] text-fg-muted">{row.paused ? 'yes' : 'no'}</td>
                <td className="py-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="py-3 font-mono text-[12px] text-fg-faint">
                  {shortAddress(row.token)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
