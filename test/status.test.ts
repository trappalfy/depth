import { describe, expect, it } from 'vitest'
import { classify, type StatusInput } from '@/lib/status'

const ONE = 1_000_000_000_000_000_000n

function input(over: Partial<StatusInput> = {}): StatusInput {
  return {
    paused: false,
    oraclePaused: false,
    uiMultiplier: ONE,
    newUIMultiplier: ONE,
    updatedAt: 1_000_000,
    now: 1_000_600, // 10 minutes old
    heartbeat: 86_400,
    quietAfter: 7_200,
    ...over,
  }
}

describe('classify', () => {
  it('returns NORMAL for a fresh, quiet feed', () => {
    expect(classify(input())).toBe('NORMAL')
  })

  it('returns TOKEN_HALTED when the token itself is paused, outranking everything', () => {
    expect(classify(input({ paused: true, oraclePaused: true }))).toBe('TOKEN_HALTED')
  })

  it('returns CORPORATE_ACTION when the oracle is paused', () => {
    expect(classify(input({ oraclePaused: true }))).toBe('CORPORATE_ACTION')
  })

  it('returns CORPORATE_ACTION when a new multiplier is pending', () => {
    expect(classify(input({ newUIMultiplier: 4n * ONE }))).toBe('CORPORATE_ACTION')
  })

  it('does NOT flag a token whose multiplier was changed in the past', () => {
    // CRWD: current and new both 4.0, the change is already applied
    expect(classify(input({ uiMultiplier: 4n * ONE, newUIMultiplier: 4n * ONE }))).toBe('NORMAL')
  })

  it('returns OFF_HOURS when the feed is quiet but still inside its heartbeat', () => {
    expect(classify(input({ now: 1_000_000 + 30_000 }))).toBe('OFF_HOURS')
  })

  it('returns STALE once the feed has missed its own heartbeat', () => {
    expect(classify(input({ now: 1_000_000 + 90_000 }))).toBe('STALE')
  })

  it('ranks a corporate action above staleness', () => {
    expect(classify(input({ oraclePaused: true, now: 1_000_000 + 90_000 }))).toBe('CORPORATE_ACTION')
  })

  it('treats a future updatedAt as fresh rather than negative-aged', () => {
    expect(classify(input({ now: 999_000 }))).toBe('NORMAL')
  })
})
