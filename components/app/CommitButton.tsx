'use client'

import type { Abi, Address } from 'viem'
import { TxButton } from '@/components/app/TxButton'
import { useBlockedReason, useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { stockOracleAdapterAbi } from '@/lib/adapterAbi'

export function CommitButton({ adapter }: { adapter: Address | null }) {
  const { state } = useDeployment()
  const blockedReason = useBlockedReason(state)

  return (
    <div>
      <TxButton
        label={copy.app.detail.commit}
        blockedReason={blockedReason ?? (adapter ? null : copy.app.blocked.notDeployed)}
        request={
          adapter
            ? {
                address: adapter,
                abi: stockOracleAdapterAbi as unknown as Abi,
                functionName: 'commit',
              }
            : null
        }
      />
      <p className="mt-3 max-w-[68ch] text-[12px] text-fg-faint">{copy.app.detail.commitNote}</p>
    </div>
  )
}
