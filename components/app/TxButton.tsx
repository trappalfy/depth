'use client'

import { useEffect } from 'react'
import type { Abi, Address } from 'viem'
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ActionButton } from '@/components/ui/ActionButton'
import { copy } from '@/content/copy.en'
import { isUserRejection, txErrorMessage } from '@/lib/txError'

export interface TxRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/**
 * The only transaction lifecycle in the console. Every write goes through it, so
 * "confirm in wallet", "pending", "done" and "failed" look and behave the same
 * everywhere, and a blocked button always states its reason instead of vanishing.
 */
export function TxButton({
  label,
  request,
  blockedReason,
  variant = 'secondary',
  className = '',
  onSuccess,
}: {
  label: string
  /** null when there is nothing to send yet — always paired with a reason. */
  request: TxRequest | null
  blockedReason: string | null
  variant?: 'primary' | 'secondary'
  className?: string
  onSuccess?: () => void
}) {
  const write = useWriteContract()
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    query: { enabled: Boolean(write.data) },
  })

  const writeError = write.error
  const writeReset = write.reset

  // A closed wallet prompt is not a failure; clear it rather than render it.
  useEffect(() => {
    if (writeError && isUserRejection(writeError)) writeReset()
  }, [writeError, writeReset])

  useEffect(() => {
    if (receipt.status === 'success') onSuccess?.()
  }, [receipt.status, onSuccess])

  const blocked = blockedReason !== null || request === null
  const busy = write.isPending || (Boolean(write.data) && receipt.status === 'pending')

  let text = label
  if (write.isPending) text = copy.app.tx.confirm
  else if (busy) text = copy.app.tx.pending
  else if (receipt.status === 'success') text = copy.app.tx.done

  const failure =
    writeError && !isUserRejection(writeError)
      ? txErrorMessage(writeError, copy.app.tx.failed)
      : receipt.status === 'error'
        ? txErrorMessage(receipt.error, copy.app.tx.failed)
        : null

  return (
    <div className={className}>
      <ActionButton
        variant={variant}
        disabled={blocked || busy}
        title={blockedReason ?? undefined}
        onClick={() => {
          if (!request) return
          write.mutate({
            abi: request.abi,
            address: request.address,
            functionName: request.functionName,
            args: request.args,
          })
        }}
        className="h-[38px] px-4 text-[15px]"
      >
        {text}
      </ActionButton>

      {blockedReason && <p className="mt-2 text-[12px] text-fg-faint">{blockedReason}</p>}
      {failure && <p className="mt-2 text-[12px] text-fg-muted">{failure}</p>}
    </div>
  )
}
