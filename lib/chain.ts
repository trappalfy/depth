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

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL ?? 'https://rpc.mainnet.chain.robinhood.com', {
    batch: true,
  }),
})
