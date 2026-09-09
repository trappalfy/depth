export interface WalletChoice {
  id: string
  name: string
  icon?: string
}

interface ConnectorLike {
  id: string
  name: string
  type: string
  icon?: string
}

/** The catch-all connector for browsers that never announced themselves. */
const GENERIC_INJECTED_ID = 'injected'

/**
 * Every connector id that is an SDK rather than an EIP-6963 discovery. It lists
 * more than we configure today: the set is what tells discovery apart from
 * hand-configured entries, so an id missing here would be mistaken for an
 * installed extension the moment someone adds that connector.
 */
const SDK_IDS = new Set(['safe', 'walletConnect', 'coinbaseWalletSDK', 'metaMaskSDK'])

/**
 * An SDK connector is redundant once the same wallet announces itself over
 * EIP-6963, keyed here by the rdns the extension reports.
 */
const SUPERSEDED_BY_DISCOVERY = new Map<string, string>([
  ['coinbaseWalletSDK', 'com.coinbase.wallet'],
  ['metaMaskSDK', 'io.metamask'],
])

export interface PickOptions {
  /**
   * Whether the page is running inside another frame. The Safe connector only
   * works inside the Safe app; anywhere else it is a button that cannot connect.
   */
  inIframe?: boolean
}

/**
 * Turns wagmi's connector list into the rows the modal shows.
 *
 * EIP-6963 gives one connector per installed extension, each with its own name
 * and icon, so those come first. The hand-configured connectors follow, minus
 * any that discovery already covers. The generic injected fallback appears only
 * when discovery found nothing at all — otherwise it lists a wallet twice, once
 * under a meaningless name.
 */
export function pickWallets(
  connectors: readonly ConnectorLike[],
  options: PickOptions = {},
): WalletChoice[] {
  const { inIframe = false } = options

  const discovered = connectors.filter((c) => c.id !== GENERIC_INJECTED_ID && !SDK_IDS.has(c.id))
  const discoveredIds = new Set(discovered.map((c) => c.id))

  const configured = connectors
    .filter((c) => SDK_IDS.has(c.id))
    .filter((c) => {
      if (c.id === 'safe' && !inIframe) return false
      const supersededBy = SUPERSEDED_BY_DISCOVERY.get(c.id)
      return supersededBy === undefined || !discoveredIds.has(supersededBy)
    })

  const fallback =
    discovered.length === 0 ? connectors.filter((c) => c.id === GENERIC_INJECTED_ID) : []

  return [...discovered, ...fallback, ...configured].map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }))
}
