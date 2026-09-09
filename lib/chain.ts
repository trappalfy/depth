import { createPublicClient, defineChain, http } from 'viem'

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
})

/**
 * The only chain the console reads from and writes to.
 *
 * Testnet 46630 is deliberately absent: `lib/assets.generated.ts` is a mainnet
 * asset table, so there would be nothing to display there. Stage 3 verifies on
 * testnet from Foundry, not from this UI.
 */
export const ACTIVE_CHAIN_ID = robinhoodChain.id

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL ?? 'https://rpc.mainnet.chain.robinhood.com', {
    batch: true,
  }),
})
