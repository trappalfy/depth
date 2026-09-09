/** How deep to walk a viem error's cause chain before giving up. */
const MAX_DEPTH = 5

/**
 * A user closing the wallet prompt is not a failure and must not be rendered as
 * one. viem surfaces it as UserRejectedRequestError, sometimes only as the
 * EIP-1193 code 4001 somewhere down the cause chain.
 */
export function isUserRejection(error: unknown): boolean {
  let node: unknown = error
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (typeof node !== 'object' || node === null) return false
    const record = node as { name?: unknown; code?: unknown; cause?: unknown }
    if (record.name === 'UserRejectedRequestError' || record.code === 4001) return true
    node = record.cause
  }
  return false
}

/** The shortest honest sentence about a failed transaction. No interpretation. */
export function txErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as { shortMessage?: unknown; message?: unknown }
    if (typeof record.shortMessage === 'string' && record.shortMessage.length > 0) {
      return record.shortMessage
    }
    if (typeof record.message === 'string' && record.message.length > 0) {
      return record.message.split('\n')[0]
    }
  }
  return fallback
}
