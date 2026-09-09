import type { Address } from 'viem'
import type { Deployment } from '@/lib/deployments'

export type DeploymentState =
  | { kind: 'unsupported' }
  | { kind: 'unconfigured' }
  | { kind: 'checking'; factory: Address }
  | { kind: 'absent'; factory: Address }
  | { kind: 'live'; factory: Address; deployedAtBlock: bigint }

export interface ResolveInput {
  /** `null`: known chain, factory not deployed. `undefined`: chain we do not serve. */
  deployment: Deployment | null | undefined
  /** True when the factory answered a view call. */
  probeOk: boolean
  probePending: boolean
}

/**
 * A flag in a file is not evidence. The console probes the configured address
 * with a real view call, so `live` means "our factory is there", not merely
 * "some code is there". A config that disagrees with the chain becomes `absent`
 * — a loud state — rather than a silent deploy into nothing.
 */
export function resolveDeployment(i: ResolveInput): DeploymentState {
  if (i.deployment === undefined) return { kind: 'unsupported' }
  if (i.deployment === null) return { kind: 'unconfigured' }

  const { factory, deployedAtBlock } = i.deployment
  if (i.probePending) return { kind: 'checking', factory }
  if (!i.probeOk) return { kind: 'absent', factory }
  return { kind: 'live', factory, deployedAtBlock }
}

/** True when a transaction against the factory or an adapter can be sent at all. */
export function canTransact(state: DeploymentState): boolean {
  return state.kind === 'live'
}
