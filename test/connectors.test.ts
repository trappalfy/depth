import { describe, expect, it } from 'vitest'
import { pickWallets } from '@/lib/connectors'

const fallback = { id: 'injected', name: 'Browser Wallet', type: 'injected' }
const rabby = { id: 'io.rabby', name: 'Rabby', type: 'injected', icon: 'data:image/svg+xml,x' }
const metamask = { id: 'io.metamask', name: 'MetaMask', type: 'injected' }
const coinbaseExt = { id: 'com.coinbase.wallet', name: 'Coinbase Wallet', type: 'injected' }
const safe = { id: 'safe', name: 'Safe', type: 'safe' }
const walletConnect = { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' }
const coinbaseSdk = { id: 'coinbaseWalletSDK', name: 'Coinbase Wallet', type: 'coinbaseWallet' }

const ids = (list: { id: string }[]) => list.map((w) => w.id)

describe('pickWallets — EIP-6963 discovery', () => {
  it('hides the generic fallback when discovery found real wallets', () => {
    expect(ids(pickWallets([fallback, rabby, metamask]))).toEqual(['io.rabby', 'io.metamask'])
  })

  it('keeps the fallback when discovery found nothing', () => {
    expect(ids(pickWallets([fallback]))).toEqual(['injected'])
  })

  it('keeps the fallback alongside configured connectors when nothing was discovered', () => {
    expect(ids(pickWallets([fallback, walletConnect]))).toEqual(['injected', 'walletConnect'])
  })

  it('carries the icon through when the wallet announced one', () => {
    expect(pickWallets([fallback, rabby])[0].icon).toBe('data:image/svg+xml,x')
  })

  it('returns an empty list when no connector exists at all', () => {
    expect(pickWallets([])).toEqual([])
  })
})

describe('pickWallets — configured connectors', () => {
  it('lists WalletConnect after the discovered extensions', () => {
    expect(ids(pickWallets([fallback, rabby, walletConnect]))).toEqual([
      'io.rabby',
      'walletConnect',
    ])
  })

  it('hides Safe outside the Safe app, where it cannot connect', () => {
    expect(ids(pickWallets([rabby, safe]))).toEqual(['io.rabby'])
  })

  it('offers Safe inside an iframe', () => {
    expect(ids(pickWallets([rabby, safe], { inIframe: true }))).toEqual(['io.rabby', 'safe'])
  })

  it('does not treat a configured connector as a discovery', () => {
    // walletConnect must not suppress the injected fallback the way a real
    // extension does — there is still no extension in this browser.
    expect(ids(pickWallets([fallback, safe, walletConnect], { inIframe: true }))).toEqual([
      'injected',
      'safe',
      'walletConnect',
    ])
  })
})

describe('pickWallets — deduplication against SDK connectors', () => {
  it('drops an SDK connector when the same wallet announced itself', () => {
    expect(ids(pickWallets([coinbaseExt, coinbaseSdk]))).toEqual(['com.coinbase.wallet'])
  })

  it('keeps an SDK connector when that wallet has no extension installed', () => {
    expect(ids(pickWallets([rabby, coinbaseSdk]))).toEqual(['io.rabby', 'coinbaseWalletSDK'])
  })
})
