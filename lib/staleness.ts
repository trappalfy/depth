import type { FeedRow } from '@/lib/snapshot'
import { QUIET_AFTER } from '@/lib/snapshot'

export interface StalenessPoint {
  symbol: string
  ageSeconds: number
  /** 0..1 across the feeds, left to right. */
  x: number
  /** 0..1 of the heartbeat allowance, clamped at the top. */
  y: number
}

export interface StalenessCurve {
  points: StalenessPoint[]
  /** True age of the oldest feed, uncapped — the annotation must not lie. */
  maxAgeSeconds: number
  heartbeatSeconds: number
  oldest: { symbol: string; ageSeconds: number } | null
  /** Feeds silent longer than QUIET_AFTER but still inside their heartbeat. */
  quietCount: number
}

/** Feeds all publish on the same 24h heartbeat today; fall back to it if empty. */
const DEFAULT_HEARTBEAT = 86_400

/**
 * A cross-section of every covered feed, sorted by how long it has been silent.
 *
 * This is NOT a time series — the site stores no history. It is the 35 feeds as
 * they stand at one instant, ordered by age, which is what makes the shape
 * readable: a flat run of fresh feeds and a tail climbing toward the heartbeat.
 *
 * `y` is normalised against the heartbeat rather than against the maximum, so
 * the curve is read against the real allowance. Normalising against the maximum
 * would make an all-fresh market look as alarming as a stalled one.
 */
export function buildStalenessCurve(rows: readonly FeedRow[], now: number): StalenessCurve {
  const heartbeatSeconds = rows[0]?.heartbeat ?? DEFAULT_HEARTBEAT

  const aged = rows
    .map((row) => ({
      symbol: row.symbol,
      // A feed cannot be published in the future; a clock skew must not go negative.
      ageSeconds: Math.max(0, now - row.updatedAt),
    }))
    .sort((a, b) => a.ageSeconds - b.ageSeconds)

  const lastIndex = aged.length - 1
  const points: StalenessPoint[] = aged.map((entry, index) => ({
    symbol: entry.symbol,
    ageSeconds: entry.ageSeconds,
    x: lastIndex > 0 ? index / lastIndex : 0,
    y:
      heartbeatSeconds > 0
        ? Math.min(1, entry.ageSeconds / heartbeatSeconds)
        : 0,
  }))

  const last = aged[lastIndex]

  return {
    points,
    maxAgeSeconds: last?.ageSeconds ?? 0,
    heartbeatSeconds,
    oldest: last ? { symbol: last.symbol, ageSeconds: last.ageSeconds } : null,
    quietCount: aged.filter((entry) => entry.ageSeconds > QUIET_AFTER).length,
  }
}
