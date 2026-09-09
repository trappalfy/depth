import { createConfig, http } from 'wagmi'
import { coinbaseWallet, injected, safe, walletConnect } from 'wagmi/connectors'
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
 * - `injected`       — browsers exposing window.ethereum without announcing it.
 *                      The modal only offers it when that object really exists.
 * - `coinbaseWallet` — works with no key of ours: the extension when installed,
 *                      otherwise a popup that pairs with Coinbase Wallet mobile.
 * - `safe`           — a protocol treasury acting through a Safe. deploy() and
 *                      commit() are exactly the kind of call a multisig sends,
 *                      and our integrators are protocols. Only functions inside
 *                      the Safe app's iframe, so the modal hides it elsewhere.
 * - `walletConnect`  — every other mobile wallet. Needs the operator's own
 *                      project id, so it appears only once that is set.
 *
 * The MetaMask SDK connector is deliberately absent. Discovery already covers
 * the extension and WalletConnect covers its mobile path, so it would mostly
 * list MetaMask twice — and it drags in a vulnerable `uuid` that only a major
 * override could lift, inside the wallet path of a product selling auditability.
 */
export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Depth' }),
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
