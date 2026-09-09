export type Status = 'NORMAL' | 'OFF_HOURS' | 'CORPORATE_ACTION' | 'TOKEN_HALTED' | 'STALE'

export interface StatusInput {
  paused: boolean
  oraclePaused: boolean
  uiMultiplier: bigint
  newUIMultiplier: bigint
  updatedAt: number
  now: number
  heartbeat: number
  /** Seconds of silence after which a feed is considered quiet but not yet broken. */
  quietAfter: number
}

export function classify(i: StatusInput): Status {
  if (i.paused) return 'TOKEN_HALTED'
  if (i.oraclePaused) return 'CORPORATE_ACTION'
  // A pending action is a difference between current and staged multipliers.
  // effectiveAt alone is NOT a signal: it holds the time of the last APPLIED change.
  if (i.newUIMultiplier !== i.uiMultiplier) return 'CORPORATE_ACTION'

  const age = Math.max(0, i.now - i.updatedAt)
  if (age > i.heartbeat) return 'STALE'
  if (age > i.quietAfter) return 'OFF_HOURS'
  return 'NORMAL'
}

export const STATUS_LABEL: Record<Status, string> = {
  NORMAL: 'Normal',
  OFF_HOURS: 'Quiet',
  CORPORATE_ACTION: 'Corporate action',
  TOKEN_HALTED: 'Token halted',
  STALE: 'Past heartbeat',
}

export const STATUS_NOTE: Record<Status, string> = {
  NORMAL: 'Feed is fresh and no corporate action is in progress.',
  OFF_HOURS:
    'The feed is silent but still within its 24-hour heartbeat. Equities trade 24/5; this chain runs 24/7.',
  CORPORATE_ACTION:
    'A multiplier change is staged or the oracle is paused. Collateral maths is unreliable in this window.',
  TOKEN_HALTED: 'Transfers on the token contract are paused.',
  STALE: 'The feed has gone longer than its own heartbeat without publishing.',
}
