import { describe, expect, it } from 'vitest'
import { isUserRejection, txErrorMessage } from '@/lib/txError'

describe('isUserRejection', () => {
  it('recognises the viem error by name', () => {
    expect(isUserRejection({ name: 'UserRejectedRequestError' })).toBe(true)
  })

  it('recognises the EIP-1193 code nested in the cause chain', () => {
    expect(isUserRejection({ name: 'ContractFunctionExecutionError', cause: { code: 4001 } })).toBe(
      true,
    )
  })

  it('does not mistake a revert for a rejection', () => {
    expect(isUserRejection({ name: 'ContractFunctionRevertedError' })).toBe(false)
  })

  it('tolerates null and primitives', () => {
    expect(isUserRejection(null)).toBe(false)
    expect(isUserRejection('boom')).toBe(false)
  })
})

describe('txErrorMessage', () => {
  it('prefers viem shortMessage', () => {
    expect(txErrorMessage({ shortMessage: 'Execution reverted.', message: 'long' }, 'fb')).toBe(
      'Execution reverted.',
    )
  })

  it('falls back to the first line of message', () => {
    expect(txErrorMessage({ message: 'first line\nsecond line' }, 'fb')).toBe('first line')
  })

  it('uses the supplied fallback for anything unreadable', () => {
    expect(txErrorMessage(undefined, 'Transaction failed.')).toBe('Transaction failed.')
  })
})
