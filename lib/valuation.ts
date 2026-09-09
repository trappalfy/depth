const WAD = 10n ** 18n

export interface ValuationInput {
  /** Raw ERC-20 balance — what balanceOf() returns, before any UI multiplier. */
  rawBalance: bigint
  /** Token decimals. Robinhood stock tokens use 18. */
  tokenDecimals: number
  /** Chainlink answer: the price of ONE RAW token, multiplier already applied. */
  price: bigint
  /** Decimals of the Chainlink answer. Every Robinhood feed uses 8. */
  priceDecimals: number
  /** ERC-8056 uiMultiplier, 18 decimals. 1e18 = 1.0. */
  uiMultiplier: bigint
}

export interface Valuation {
  /** balanceOf() x Chainlink — the correct answer. USD, 18 decimals. */
  correct: bigint
  /** balanceOfUI() x Chainlink — the multiplier lands twice. */
  doubleCounted: bigint
  /** balanceOf() x the unadjusted REST quote — the multiplier never lands. */
  unadjusted: bigint
}

export type Convention = 'correct' | 'doubleCounted' | 'unadjusted'

export function valuate(i: ValuationInput): Valuation {
  if (i.uiMultiplier <= 0n) {
    throw new Error('uiMultiplier must be positive')
  }

  const correct =
    (i.rawBalance * i.price * WAD) /
    (10n ** BigInt(i.tokenDecimals) * 10n ** BigInt(i.priceDecimals))

  return {
    correct,
    // balanceOfUI() is balanceOf() scaled by the multiplier, so pairing it with
    // a feed price that already carries the multiplier applies it a second time.
    doubleCounted: (correct * i.uiMultiplier) / WAD,
    // The REST quote is the underlying share price: Chainlink / uiMultiplier.
    unadjusted: (correct * WAD) / i.uiMultiplier,
  }
}

/** Signed dollar error a protocol takes on by using `convention`. 18 decimals. */
export function valuationError(v: Valuation, convention: Convention): bigint {
  return v[convention] - v.correct
}
