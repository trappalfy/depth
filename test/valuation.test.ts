import { describe, expect, it } from 'vitest'
import { valuate, valuationError } from '@/lib/valuation'

const WAD = 10n ** 18n

/** One whole token of a $364.78 stock, feed at 8 decimals, multiplier 1.0. */
const base = {
  rawBalance: WAD,
  tokenDecimals: 18,
  price: 36_478n * 10n ** 6n,
  priceDecimals: 8,
  uiMultiplier: WAD,
}

describe('valuate', () => {
  it('agrees with itself when the multiplier is 1.0', () => {
    const v = valuate(base)
    expect(v.correct).toBe(36_478n * 10n ** 16n)
    expect(v.doubleCounted).toBe(v.correct)
    expect(v.unadjusted).toBe(v.correct)
  })

  it('applies the multiplier twice on the balanceOfUI path', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(v.doubleCounted).toBe(v.correct * 4n)
  })

  it('drops the multiplier entirely on the REST-price path', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(v.unadjusted).toBe(v.correct / 4n)
  })

  it('handles a fractional balance', () => {
    const v = valuate({ ...base, rawBalance: WAD / 2n })
    expect(v.correct).toBe((36_478n * 10n ** 16n) / 2n)
  })

  it('returns zero for a zero balance', () => {
    const v = valuate({ ...base, rawBalance: 0n })
    expect(v).toEqual({ correct: 0n, doubleCounted: 0n, unadjusted: 0n })
  })

  it('refuses a non-positive multiplier rather than dividing by zero', () => {
    expect(() => valuate({ ...base, uiMultiplier: 0n })).toThrow()
  })
})

describe('valuationError', () => {
  it('is zero for the correct convention', () => {
    expect(valuationError(valuate(base), 'correct')).toBe(0n)
  })

  it('is the signed overstatement for the double-counted convention', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(valuationError(v, 'doubleCounted')).toBe(v.correct * 3n)
  })

  it('is the signed understatement for the unadjusted convention', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(valuationError(v, 'unadjusted')).toBe(-(v.correct * 3n) / 4n)
  })
})
