import { describe, expect, it } from 'vitest'
import {
  formatAge,
  formatAgo,
  formatPrice,
  formatMultiplier,
  heartbeatFraction,
  shortAddress,
} from '@/lib/format'

describe('formatAge', () => {
  it('reports sub-minute ages as just now', () => {
    expect(formatAge(0)).toBe('just now')
    expect(formatAge(59)).toBe('just now')
  })
  it('reports whole minutes under an hour', () => {
    expect(formatAge(60)).toBe('1m')
    expect(formatAge(1618)).toBe('26m')
  })
  it('reports hours and minutes under a day', () => {
    expect(formatAge(29520)).toBe('8h 12m')
  })
  it('reports days and hours beyond a day', () => {
    expect(formatAge(273600)).toBe('3d 4h')
  })
  it('treats negative clock skew as just now', () => {
    expect(formatAge(-5)).toBe('just now')
  })
})

describe('formatPrice', () => {
  it('renders 8-decimal Chainlink answers with two decimals', () => {
    expect(formatPrice(36478665000n, 8)).toBe('364.79')
  })
  it('renders 18-decimal answers', () => {
    expect(formatPrice(1500000000000000000n, 18)).toBe('1.50')
  })
})

describe('formatMultiplier', () => {
  it('renders an unadjusted multiplier', () => {
    expect(formatMultiplier(1000000000000000000n)).toBe('1.000000')
  })
  it('renders a 4:1 split', () => {
    expect(formatMultiplier(4000000000000000000n)).toBe('4.000000')
  })
  it('keeps six decimals of dividend drift', () => {
    expect(formatMultiplier(1000566080061092436n)).toBe('1.000566')
  })
})

describe('heartbeatFraction', () => {
  it('is zero at a fresh read', () => {
    expect(heartbeatFraction(0, 86400)).toBe(0)
  })
  it('is a half at half the heartbeat', () => {
    expect(heartbeatFraction(43200, 86400)).toBe(0.5)
  })
  it('clamps past the heartbeat', () => {
    expect(heartbeatFraction(200000, 86400)).toBe(1)
  })
  it('clamps negative ages', () => {
    expect(heartbeatFraction(-10, 86400)).toBe(0)
  })
})

describe('shortAddress', () => {
  it('elides the middle', () => {
    expect(shortAddress('0x322F0929c4625eD5bAd873c95208D54E1c003b2d')).toBe('0x322F…3b2d')
  })
})

describe('formatAgo', () => {
  it('does not say "just now ago"', () => {
    expect(formatAgo(0)).toBe('just now')
    expect(formatAgo(59)).toBe('just now')
  })

  it('says ago for everything a duration can be said about', () => {
    expect(formatAgo(60)).toBe('1m ago')
    expect(formatAgo(3_600)).toBe('1h 0m ago')
    expect(formatAgo(90_000)).toBe('1d 1h ago')
  })
})
