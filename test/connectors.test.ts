import { describe, expect, it } from 'vitest'
import { pickWallets } from '@/lib/connectors'

const fallback = { id: 'injected', name: 'Browser Wallet', type: 'injected' }
const rabby = { id: 'io.rabby', name: 'Rabby', type: 'injected', icon: 'data:image/svg+xml,x' }
const metamask = { id: 'io.metamask', name: 'MetaMask', type: 'injected' }

describe('pickWallets', () => {
  it('hides the generic fallback when EIP-6963 discovered real wallets', () => {
    expect(pickWallets([fallback, rabby, metamask]).map((w) => w.id)).toEqual([
      'io.rabby',
      'io.metamask',
    ])
  })

  it('keeps the fallback when discovery found nothing', () => {
    expect(pickWallets([fallback]).map((w) => w.id)).toEqual(['injected'])
  })

  it('carries the icon through when the wallet announced one', () => {
    expect(pickWallets([fallback, rabby])[0].icon).toBe('data:image/svg+xml,x')
  })

  it('returns an empty list when no connector exists at all', () => {
    expect(pickWallets([])).toEqual([])
  })
})
