'use client'

import type { Address } from 'viem'
import { useConnection, useReadContracts } from 'wagmi'
import { useMounted } from '@/components/wallet/useMounted'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'
import { ACTIVE_CHAIN_ID } from '@/lib/chain'
import { resolveDeployment, type DeploymentState } from '@/lib/deployment-state'
import { deploymentFor } from '@/lib/deployments'

export interface FactoryParams {
  quietAfter: bigint
  protectionBudget: bigint
  continuityBps: number
  sequencerFeed: Address
}

/**
 * The single place that answers "is the factory really there, and what is it
 * configured with". Every transaction button in the console goes through it, so
 * the pre-mainnet condition lives here instead of leaking into components.
 *
 * The probe is a real view call rather than a bytecode read: it proves our
 * factory is at that address, not merely that some code is.
 */
export function useDeployment(): { state: DeploymentState; params: FactoryParams | null } {
  const deployment = deploymentFor(ACTIVE_CHAIN_ID)
  const factory = deployment?.factory

  const probe = useReadContracts({
    allowFailure: true,
    contracts: factory
      ? ([
          { address: factory, abi: adapterFactoryAbi, functionName: 'quietAfter' },
          { address: factory, abi: adapterFactoryAbi, functionName: 'protectionBudget' },
          { address: factory, abi: adapterFactoryAbi, functionName: 'continuityBps' },
          { address: factory, abi: adapterFactoryAbi, functionName: 'sequencerFeed' },
        ] as const)
      : [],
    query: { enabled: Boolean(factory) },
  })

  const results = probe.data

  // Read one result at a time through a local, so TypeScript can narrow the
  // success/failure union. Narrowing through .every() or a chained index does
  // not survive, and casting past it would defeat the point of allowFailure.
  const valueAt = (index: number): unknown => {
    const entry = results?.[index]
    return entry && entry.status === 'success' ? entry.result : undefined
  }

  const quietAfter = valueAt(0)
  const protectionBudget = valueAt(1)
  const continuityBps = valueAt(2)
  const sequencerFeed = valueAt(3)

  const state = resolveDeployment({
    deployment,
    probeOk: quietAfter !== undefined,
    probePending: Boolean(factory) && probe.isPending,
  })

  const params: FactoryParams | null =
    state.kind === 'live' &&
    typeof quietAfter === 'bigint' &&
    typeof protectionBudget === 'bigint' &&
    typeof continuityBps === 'number' &&
    typeof sequencerFeed === 'string'
      ? {
          quietAfter,
          protectionBudget,
          continuityBps,
          sequencerFeed: sequencerFeed as Address,
        }
      : null

  return { state, params }
}

/**
 * Why a transaction cannot be sent right now, or null when it can.
 * Order matters: report the condition the user can act on first.
 */
export function useBlockedReason(state: DeploymentState): string | null {
  const mounted = useMounted()
  const connection = useConnection()

  if (!mounted || connection.status !== 'connected') return copy.app.blocked.notConnected
  if (connection.chainId !== ACTIVE_CHAIN_ID) return copy.app.blocked.wrongNetwork

  switch (state.kind) {
    case 'unsupported':
      return copy.app.blocked.unsupported
    case 'unconfigured':
      return copy.app.blocked.notDeployed
    case 'checking':
      return copy.app.blocked.checking
    case 'absent':
      return copy.app.blocked.absent
    case 'live':
      return null
  }
}
