'use client'

import type { Abi, Address } from 'viem'
import { TxButton } from '@/components/app/TxButton'
import { useBlockedReason, useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'

/**
 * Permissionless. Whoever pays the gas gets nothing: the adapter is immutable
 * and ownerless, and its address was determined before anyone pressed anything.
 */
export function DeployButton({ token, feed }: { token: Address; feed: Address }) {
  const { state } = useDeployment()
  const blockedReason = useBlockedReason(state)

  return (
    <TxButton
      label={copy.app.list.deploy}
      blockedReason={blockedReason}
      request={
        state.kind === 'live'
          ? {
              address: state.factory,
              abi: adapterFactoryAbi as unknown as Abi,
              functionName: 'deploy',
              args: [token, feed],
            }
          : null
      }
    />
  )
}
