import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { robinhoodChain } from '@/lib/chain'

/**
 * EIP-6963 discovery is on by default and supplies one connector per installed
 * wallet, with its own name and icon. The `injected` connector below is only a
 * fallback for browsers that expose `window.ethereum` without announcing it;
 * `pickWallets` in lib/connectors.ts keeps it from showing as a duplicate.
 */
export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: {
    [robinhoodChain.id]: http(),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
