import type { AdapterStatus } from '@/lib/adapterStatus'
import type { Status } from '@/lib/status'

/**
 * What a deployed adapter would answer, worked out from the same live feed data
 * the board already classifies — the console's pre-deployment preview.
 *
 * The rule that governs this file: preview only what the off-chain rules can
 * actually decide. Anything that needs the adapter's own committed snapshot, or
 * a contract semantic Stage 2 has not fixed yet, returns null and the screen
 * says why. A preview is allowed to be incomplete; it is not allowed to guess.
 */

/**
 * The enum value the adapter would report.
 *
 * STALE has no counterpart: the on-chain enum carries no past-heartbeat member,
 * and which value covers it is a Stage 2 decision. DESYNC and UNSAFE never
 * appear here either — the first needs a committed snapshot to detect, the
 * second is a property of a deployed contract's spent budget.
 */
export function previewAdapterStatus(status: Status): AdapterStatus | null {
  switch (status) {
    case 'NORMAL':
      return 'NORMAL'
    case 'OFF_HOURS':
      return 'OFF_HOURS'
    case 'CORPORATE_ACTION':
      return 'CORPORATE_ACTION'
    case 'TOKEN_HALTED':
      return 'TOKEN_HALTED'
    case 'STALE':
      return null
  }
}

/** True while the adapter would pass the feed's own number through untouched. */
export function servesFeedPrice(status: Status): boolean {
  return status === 'NORMAL' || status === 'OFF_HOURS'
}

/**
 * The price the adapter would answer with, or null when that price is the one
 * held from before a protection window opened — which only the adapter knows,
 * because only the adapter committed it.
 */
export function previewAnswer(status: Status, feedPrice: bigint): bigint | null {
  return servesFeedPrice(status) ? feedPrice : null
}

/**
 * Protection budget left, or null once a window is open: the budget runs from
 * the moment the window opened, and off chain we cannot know that moment.
 */
export function previewBudgetRemaining(status: Status, budget: bigint): bigint | null {
  return servesFeedPrice(status) ? budget : null
}
