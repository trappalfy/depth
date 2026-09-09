/**
 * The adapter's on-chain Status enum. Order is load-bearing: Solidity encodes
 * enums as uint8 by declaration order, and this array must match the order in
 * IStockOracleAdapter exactly.
 *
 * Kept beside its module rather than in content/copy.en.ts, following the
 * precedent set by lib/status.ts for the off-chain classifier.
 */
export const ADAPTER_STATUSES = [
  'NORMAL',
  'OFF_HOURS',
  'CORPORATE_ACTION',
  'DESYNC',
  'TOKEN_HALTED',
  'SEQUENCER_DOWN',
  'UNSAFE',
] as const

export type AdapterStatus = (typeof ADAPTER_STATUSES)[number]

export function adapterStatusFromEnum(value: number): AdapterStatus | null {
  if (!Number.isInteger(value) || value < 0 || value >= ADAPTER_STATUSES.length) return null
  return ADAPTER_STATUSES[value]
}

export const ADAPTER_STATUS_LABEL: Record<AdapterStatus, string> = {
  NORMAL: 'Normal',
  OFF_HOURS: 'Quiet',
  CORPORATE_ACTION: 'Corporate action',
  DESYNC: 'Desync',
  TOKEN_HALTED: 'Token halted',
  SEQUENCER_DOWN: 'Sequencer down',
  UNSAFE: 'Unsafe',
}

export const ADAPTER_STATUS_NOTE: Record<AdapterStatus, string> = {
  NORMAL: 'The feed is fresh and no corporate action is in progress. The price passes through.',
  OFF_HOURS:
    'The feed is silent but every flag is clean and the continuity invariant holds. Equities trade 24/5; this chain runs 24/7. The last price stands.',
  CORPORATE_ACTION:
    'The oracle is paused or a multiplier change is staged. The adapter serves the price held from before the window opened.',
  DESYNC:
    'The continuity invariant broke: the price moved against the multiplier in a way a split cannot explain. The held price stands regardless of any flag.',
  TOKEN_HALTED: 'Transfers on the token contract are paused. The held price stands.',
  SEQUENCER_DOWN:
    'Dormant. No sequencer uptime feed exists on this chain, so the check is disabled unless one is supplied at construction.',
  UNSAFE:
    'The protection budget is exhausted. The adapter reverts. Breaking loudly beats lying quietly.',
}
