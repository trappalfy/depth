import type { Address } from 'viem'
import { ACTIVE_CHAIN_ID } from '@/lib/chain'

export interface Deployment {
  /** AdapterFactory address. */
  factory: Address
  /** Block the factory was deployed at — provenance for the explorer link. */
  deployedAtBlock: bigint
}

/**
 * THE ONLY LATE-BOUND VALUE IN THE CONSOLE.
 *
 * Mainnet day was 22 September 2026: the factory went in at block 69,889,995
 * and this one line was the entire change — every screen under /app came alive
 * off it. The prediction held, which is the point of having written it down.
 *
 * `null` means a chain we serve with no factory on it. Nothing else belongs in
 * this file: no ABIs, no parameters, no adapter addresses. The factory holds
 * the parameters and derives the adapter addresses itself, so there is nothing
 * here that could drift away from the chain.
 */
export const DEPLOYMENTS: Partial<Record<number, Deployment | null>> = {
  [ACTIVE_CHAIN_ID]: { factory: '0xcD70a518a78807C355A4B9aB8676Bd7C848806D1', deployedAtBlock: 69_889_995n },
}

/** `null` = known chain, no factory. `undefined` = a chain we do not serve. */
export function deploymentFor(chainId: number): Deployment | null | undefined {
  return DEPLOYMENTS[chainId]
}
