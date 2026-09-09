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
 * `null` means the factory is not on chain yet. On mainnet day this entry
 * becomes `{ factory: '0x…', deployedAtBlock: …n }` and every screen under /app
 * comes alive. Nothing else in the codebase should need to change; if it does,
 * the design spec has been violated.
 *
 * Nothing else belongs in this file — no ABIs, no parameters, no adapter
 * addresses. Adapter addresses are computed by the factory itself.
 */
export const DEPLOYMENTS: Partial<Record<number, Deployment | null>> = {
  [ACTIVE_CHAIN_ID]: null,
}

/** `null` = known chain, no factory. `undefined` = a chain we do not serve. */
export function deploymentFor(chainId: number): Deployment | null | undefined {
  return DEPLOYMENTS[chainId]
}
