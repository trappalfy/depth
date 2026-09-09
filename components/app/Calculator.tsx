'use client'

import { useMemo, useState } from 'react'
import { parseUnits } from 'viem'
import { copy } from '@/content/copy.en'
import { formatPrice } from '@/lib/format'
import type { FeedRow } from '@/lib/snapshot'
import { valuate, valuationError, type Convention } from '@/lib/valuation'

const TOKEN_DECIMALS = 18

/** USD with 18 decimals, rendered to cents by reusing the price formatter. */
function usd(value: bigint): string {
  const negative = value < 0n
  const text = formatPrice(negative ? -value : value, 18)
  return `${negative ? '-' : ''}$${text}`
}

/**
 * The interactive core only — no heading and no source note, so the adapter page
 * and the standalone page can each frame it their own way while the maths lives
 * in one file.
 *
 * `locked` is for the adapter page, where the asset is already decided by the
 * route: the selector would be a way to wander off the adapter you opened.
 */
export function Calculator({
  rows,
  initialSymbol,
  locked = false,
}: {
  rows: readonly FeedRow[]
  initialSymbol?: string
  locked?: boolean
}) {
  const requested = initialSymbol?.toUpperCase()
  const preselected = rows.find((r) => r.symbol === requested)
  // Only the tokens with an on-chain feed can be valued. Asking for one of the
  // others must say so rather than silently swap in a different asset.
  const requestedIsUncovered = Boolean(requested) && preselected === undefined
  const [symbol, setSymbol] = useState(preselected?.symbol ?? rows[0]?.symbol ?? '')
  const [amount, setAmount] = useState('100')
  const [convention, setConvention] = useState<Convention>('doubleCounted')

  const row = rows.find((r) => r.symbol === symbol)

  const result = useMemo(() => {
    if (!row) return null
    let rawBalance: bigint
    try {
      rawBalance = parseUnits(amount.trim() === '' ? '0' : amount.trim(), TOKEN_DECIMALS)
    } catch {
      // An unparseable amount is a half-typed number, not an error to shout about.
      return null
    }
    if (rawBalance < 0n) return null

    const valuation = valuate({
      rawBalance,
      tokenDecimals: TOKEN_DECIMALS,
      price: BigInt(row.price),
      priceDecimals: row.priceDecimals,
      uiMultiplier: BigInt(row.uiMultiplier),
    })
    return { valuation, error: valuationError(valuation, convention) }
  }, [row, amount, convention])

  const field =
    'mt-2 w-full rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 px-4 py-3 text-[15px] text-white outline-none focus:border-white/[0.24]'

  const cells: { key: Convention; label: string; verdict: string }[] = [
    {
      key: 'correct',
      label: copy.app.calculator.correct,
      verdict: copy.app.calculator.correctVerdict,
    },
    {
      key: 'doubleCounted',
      label: copy.app.calculator.doubleCounted,
      verdict: copy.app.calculator.doubleCountedVerdict,
    },
    {
      key: 'unadjusted',
      label: copy.app.calculator.unadjusted,
      verdict: copy.app.calculator.unadjustedVerdict,
    },
  ]

  return (
    <div>
      {requestedIsUncovered && (
        <p className="mb-8 max-w-[68ch] text-[15px] text-fg-muted">
          <span className="font-mono">{requested}</span> {copy.app.calculator.unknownAsset}
        </p>
      )}

      <div className={`grid gap-6 ${locked ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {!locked && (
          <label className="block">
            <span className="text-[12px] text-fg-faint">{copy.app.calculator.asset}</span>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={field}>
              {rows.map((r) => (
                <option key={r.symbol} value={r.symbol} className="bg-ink-700">
                  {r.symbol} — {r.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-[12px] text-fg-faint">{copy.app.calculator.amount}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${field} font-mono tabular-nums`}
          />
        </label>

        <label className="block">
          <span className="text-[12px] text-fg-faint">{copy.app.calculator.convention}</span>
          <select
            value={convention}
            onChange={(e) => setConvention(e.target.value as Convention)}
            className={field}
          >
            {cells.map((c) => (
              <option key={c.key} value={c.key} className="bg-ink-700">
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {result && row && (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6"
              >
                <p className="font-mono text-[12px] text-fg-faint">{cell.label}</p>
                <p className="mt-2 font-mono text-[33px] leading-none tabular-nums">
                  {usd(result.valuation[cell.key])}
                </p>
                <p className="mt-4 text-[12px] text-fg-muted">{cell.verdict}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
            <p className="text-[12px] text-fg-faint">{copy.app.calculator.error}</p>
            <p
              className={`mt-2 font-mono text-[33px] leading-none tabular-nums ${
                result.error === 0n ? '' : result.error > 0n ? 'text-up' : 'text-down'
              }`}
            >
              {result.error === 0n ? usd(0n) : `${result.error > 0n ? '+' : ''}${usd(result.error)}`}
            </p>
            {BigInt(row.uiMultiplier) === 10n ** 18n && (
              <p className="mt-4 max-w-[68ch] text-[12px] text-fg-faint">
                {copy.app.calculator.exact}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
