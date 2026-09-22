import { createPublicClient, defineChain, http } from 'viem'

/** The chain's own public endpoint: no key, and rate-limited accordingly. */
export const PUBLIC_RPC = 'https://rpc.mainnet.chain.robinhood.com'

/**
 * Where the browser half of the app reads the chain.
 *
 * The browser cannot read a server secret, so an operator's endpoint has to be
 * public to be usable here — NEXT_PUBLIC_ is the honest name for that, and an
 * endpoint whose URL is its only credential should never be put behind it.
 * Unset means the chain's own public endpoint, which is what runs today.
 *
 * It is also how the console is pointed at a local fork for a rehearsal:
 * NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 npm run dev
 */
const browserRpc = process.env.NEXT_PUBLIC_RPC_URL || PUBLIC_RPC

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [browserRpc] } },
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

/**
 * The server's own client. RPC_URL may hold a keyed endpoint — it never
 * reaches the browser — and falls back to whatever the browser uses.
 */
export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL || browserRpc, {
    batch: true,
  }),
})
