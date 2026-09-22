import type { Address } from 'viem'

export interface TokenLaunch {
  /** The contract address. The one thing this page exists to publish. */
  address: Address
  /** The chain it lives on — for the label and the explorer link. */
  chainId: number
  chainName: string
  /** Where to read it from. */
  rpcUrl: string
  /** Explorer base, no trailing slash: `${explorer}/address/${address}`. */
  explorer: string
  /** The block it was deployed at — provenance, the way the factory has it. */
  launchedAtBlock: bigint
}

/**
 * THE ONLY LATE-BOUND VALUE ON /token.
 *
 * `null` means the token has not launched. Filling this in is the entire
 * change: the page then reads the contract's own name, symbol, decimals and
 * total supply off the chain and renders them with the block they were read
 * at. Nothing about the token is typed by hand, so nothing here can drift away
 * from what is actually deployed — the same discipline lib/deployments.ts
 * holds the adapter factory to.
 *
 * It carries its own rpcUrl and explorer rather than assuming Robinhood Chain,
 * so the token can launch wherever it launches without touching the page.
 */
export const TOKEN: TokenLaunch | null = null
