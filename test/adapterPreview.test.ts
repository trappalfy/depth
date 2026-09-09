import { describe, expect, it } from 'vitest'
import {
  previewAdapterStatus,
  previewAnswer,
  previewBudgetRemaining,
  servesFeedPrice,
} from '@/lib/adapterPreview'
import { ADAPTER_PARAMS } from '@/lib/adapterParams'
import { QUIET_AFTER } from '@/lib/snapshot'
import type { Status } from '@/lib/status'

const PRICE = 123_456_789n

describe('previewAdapterStatus', () => {
  it('maps the states the off-chain rules can decide', () => {
    expect(previewAdapterStatus('NORMAL')).toBe('NORMAL')
    expect(previewAdapterStatus('OFF_HOURS')).toBe('OFF_HOURS')
    expect(previewAdapterStatus('CORPORATE_ACTION')).toBe('CORPORATE_ACTION')
    expect(previewAdapterStatus('TOKEN_HALTED')).toBe('TOKEN_HALTED')
  })

  it('refuses to guess at a past-heartbeat feed, which the enum does not cover', () => {
    expect(previewAdapterStatus('STALE')).toBeNull()
  })
})

describe('previewAnswer', () => {
  it('passes the feed price through while the adapter would', () => {
    expect(previewAnswer('NORMAL', PRICE)).toBe(PRICE)
    expect(previewAnswer('OFF_HOURS', PRICE)).toBe(PRICE)
  })

  it('returns null once the answer would be a held price', () => {
    const holding: Status[] = ['CORPORATE_ACTION', 'TOKEN_HALTED', 'STALE']
    for (const status of holding) {
      expect(previewAnswer(status, PRICE)).toBeNull()
    }
  })

  it('never substitutes zero for an unknown held price', () => {
    expect(previewAnswer('CORPORATE_ACTION', 0n)).toBeNull()
  })
})

describe('previewBudgetRemaining', () => {
  it('reports the full budget while no window is open', () => {
    expect(previewBudgetRemaining('NORMAL', 259_200n)).toBe(259_200n)
    expect(previewBudgetRemaining('OFF_HOURS', 259_200n)).toBe(259_200n)
  })

  it('returns null once a window is open, since its start is unknown off chain', () => {
    expect(previewBudgetRemaining('CORPORATE_ACTION', 259_200n)).toBeNull()
    expect(previewBudgetRemaining('TOKEN_HALTED', 259_200n)).toBeNull()
  })
})

describe('servesFeedPrice', () => {
  it('agrees with the two states that pass a live number through', () => {
    expect(servesFeedPrice('NORMAL')).toBe(true)
    expect(servesFeedPrice('OFF_HOURS')).toBe(true)
    expect(servesFeedPrice('CORPORATE_ACTION')).toBe(false)
  })
})

describe('ADAPTER_PARAMS', () => {
  it('uses the same quiet threshold as the off-chain classifier', () => {
    // Two thresholds would mean the console and the contract disagreeing about
    // what "quiet" is, which is exactly the class of bug this product is about.
    expect(ADAPTER_PARAMS.quietAfter).toBe(BigInt(QUIET_AFTER))
  })

  it('disables the sequencer check rather than pointing it at a made-up feed', () => {
    expect(ADAPTER_PARAMS.sequencerFeed).toBe('0x0000000000000000000000000000000000000000')
  })

  it('keeps the continuity tolerance inside a sane band', () => {
    expect(ADAPTER_PARAMS.continuityBps).toBeGreaterThan(0)
    expect(ADAPTER_PARAMS.continuityBps).toBeLessThan(1_000)
  })
})
