import type { Address } from 'viem'
import { QUIET_AFTER } from '@/lib/snapshot'

/**
 * The constructor arguments the factory will be deployed with.
 *
 * They exist here so the console can show the configuration it will run under
 * before that configuration is on chain. The moment the factory is live,
 * useDeployment() reads the real values off it and those win everywhere — this
 * file is never consulted again, so a drift between the two cannot hide.
 *
 * Provisional until the Stage 2 scenario tests run against them.
 */
export interface AdapterParams {
  /** Silence after which a feed is quiet but not yet broken. */
  quietAfter: bigint
  /** How long the adapter may hold a price before it reverts instead. */
  protectionBudget: bigint
  /** Tolerance on the continuity invariant, in basis points. */
  continuityBps: number
  /** Chainlink sequencer uptime feed, or zero where none is published. */
  sequencerFeed: Address
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export const ADAPTER_PARAMS: AdapterParams = {
  // The same threshold the off-chain classifier uses, so the console and the
  // contract cannot disagree about what "quiet" means.
  quietAfter: BigInt(QUIET_AFTER),

  // 72 hours. A held price is a frozen one, and a frozen price left indefinitely
  // is unbounded bad debt: the budget is the deadline after which the adapter
  // reverts instead of holding. It covers a long weekend plus a full trading day
  // for an issuer to lift a pause, and no more.
  protectionBudget: 259_200n,

  // 2%. A split must leave price × multiplier continuous; this is how far the
  // pair may drift before the adapter calls it a desync rather than a market
  // move. Tighter risks false positives on a volatile print, looser lets a real
  // desync through.
  continuityBps: 200,

  // Robinhood Chain publishes no sequencer uptime feed. Zero disables the check
  // rather than pretending it runs — the day one exists, a new deployment
  // supplies it and the dormant state switches on.
  sequencerFeed: ZERO_ADDRESS,
}
