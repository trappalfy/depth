import { createConfig, http } from 'wagmi'
import { injected, safe, walletConnect } from 'wagmi/connectors'
import { robinhoodChain } from '@/lib/chain'

/**
 * Supplied by the operator, never by us: obtaining one means registering an
 * account with WalletConnect Cloud, which is not ours to do. Unset means the
 * WalletConnect option simply is not offered — no broken button.
 */
const walletConnectProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID

/**
 * EIP-6963 discovery is on by default and already supplies one connector per
 * installed browser extension — MetaMask, Rabby, Frame and the rest each arrive
 * separately, with their own name and icon. The connectors below cover what
 * discovery cannot reach:
 *
 * - `injected`  — browsers that expose window.ethereum without announcing it.
 * - `safe`      — a protocol treasury acting through a Safe. deploy() and
 *                 commit() are exactly the kind of call a multisig sends, and
 *                 our integrators are protocols. Only functions inside the
 *                 Safe app's iframe, so the modal hides it elsewhere.
 * - `walletConnect` — every mobile wallet, which has no extension to discover.
 *
 * The MetaMask SDK connector is deliberately absent: discovery already covers
 * the extension, and its mobile path is what WalletConnect provides. Adding it
 * would list MetaMask twice.
 */
export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected(),
    safe(),
    ...(walletConnectProjectId
      ? // Its own QR modal stays on: rendering the pairing URI ourselves would
        // mean writing a QR encoder, and a silent button is worse than a
        // foreign one.
        [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
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
