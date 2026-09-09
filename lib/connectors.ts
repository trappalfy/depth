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

/**
 * EIP-6963 gives one connector per installed wallet, each announcing its own
 * name and icon. The configured `injected` fallback only exists for browsers
 * that expose `window.ethereum` without announcing it — listing it beside the
 * discovered wallets would show the same wallet twice, so it appears only when
 * discovery found nothing.
 */
export function pickWallets(connectors: readonly ConnectorLike[]): WalletChoice[] {
  const discovered = connectors.filter((c) => c.id !== 'injected')
  const source = discovered.length > 0 ? discovered : connectors
  return source.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
}
