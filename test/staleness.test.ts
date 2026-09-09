import { describe, expect, it } from 'vitest'
import type { FeedRow } from '@/lib/snapshot'
import { buildStalenessCurve } from '@/lib/staleness'

const HOUR = 3_600
const DAY = 86_400

/** Only the fields the curve reads; the rest of FeedRow is irrelevant here. */
function feed(symbol: string, ageSeconds: number, now: number): FeedRow {
  return {
    symbol,
    name: symbol,
    token: '0x0000000000000000000000000000000000000001',
    feed: '0x0000000000000000000000000000000000000002',
    heartbeat: DAY,
    price: '0',
    priceDecimals: 8,
    updatedAt: now - ageSeconds,
    uiMultiplier: '1000000000000000000',
    newUIMultiplier: '1000000000000000000',
    effectiveAt: 0,
    oraclePaused: false,
    paused: false,
    status: 'NORMAL',
  }
}

const NOW = 1_800_000_000

describe('buildStalenessCurve', () => {
  it('returns an empty curve for no feeds rather than throwing', () => {
    const curve = buildStalenessCurve([], NOW)
    expect(curve.points).toEqual([])
    expect(curve.oldest).toBeNull()
    expect(curve.maxAgeSeconds).toBe(0)
    expect(curve.quietCount).toBe(0)
  })

  it('sorts feeds by age ascending, whatever order they arrive in', () => {
    const curve = buildStalenessCurve(
      [feed('C', 10 * HOUR, NOW), feed('A', 1 * HOUR, NOW), feed('B', 5 * HOUR, NOW)],
      NOW,
    )
    expect(curve.points.map((p) => p.symbol)).toEqual(['A', 'B', 'C'])
  })

  it('normalises age against the heartbeat, not against the maximum', () => {
    // 12h of a 24h heartbeat is half the allowance, even though it is the oldest.
    const curve = buildStalenessCurve([feed('A', 12 * HOUR, NOW)], NOW)
    expect(curve.points[0].y).toBeCloseTo(0.5, 6)
  })

  it('places a feed at exactly its heartbeat at the top of the scale', () => {
    const curve = buildStalenessCurve([feed('A', DAY, NOW)], NOW)
    expect(curve.points[0].y).toBe(1)
  })

  it('clamps a feed past its heartbeat rather than running off the chart', () => {
    const curve = buildStalenessCurve([feed('A', 3 * DAY, NOW)], NOW)
    expect(curve.points[0].y).toBe(1)
    // The honest age still surfaces in the annotation.
    expect(curve.oldest).toEqual({ symbol: 'A', ageSeconds: 3 * DAY })
  })

  it('clamps a future updatedAt to zero instead of going negative', () => {
    const curve = buildStalenessCurve([feed('A', -HOUR, NOW)], NOW)
    expect(curve.points[0].y).toBe(0)
    expect(curve.maxAgeSeconds).toBe(0)
  })

  it('spreads x evenly across the feeds and spans the full width', () => {
    const curve = buildStalenessCurve(
      [feed('A', HOUR, NOW), feed('B', 2 * HOUR, NOW), feed('C', 3 * HOUR, NOW)],
      NOW,
    )
    expect(curve.points.map((p) => p.x)).toEqual([0, 0.5, 1])
  })

  it('puts a single feed at the left edge rather than dividing by zero', () => {
    const curve = buildStalenessCurve([feed('A', HOUR, NOW)], NOW)
    expect(curve.points[0].x).toBe(0)
  })

  it('reports the oldest feed by its true age', () => {
    const curve = buildStalenessCurve(
      [feed('A', HOUR, NOW), feed('OLD', 14 * HOUR, NOW), feed('B', 2 * HOUR, NOW)],
      NOW,
    )
    expect(curve.oldest).toEqual({ symbol: 'OLD', ageSeconds: 14 * HOUR })
    expect(curve.maxAgeSeconds).toBe(14 * HOUR)
  })

  it('counts the feeds past the quiet threshold', () => {
    // QUIET_AFTER is 2h: 1h is fresh, 3h and 5h are quiet.
    const curve = buildStalenessCurve(
      [feed('A', HOUR, NOW), feed('B', 3 * HOUR, NOW), feed('C', 5 * HOUR, NOW)],
      NOW,
    )
    expect(curve.quietCount).toBe(2)
  })

  it('takes the heartbeat from the feeds themselves', () => {
    const short = { ...feed('A', HOUR, NOW), heartbeat: 2 * HOUR }
    expect(buildStalenessCurve([short], NOW).heartbeatSeconds).toBe(2 * HOUR)
    expect(buildStalenessCurve([short], NOW).points[0].y).toBeCloseTo(0.5, 6)
  })
})
