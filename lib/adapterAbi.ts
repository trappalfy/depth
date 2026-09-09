/**
 * THE INTERFACE STAGE 2 MUST IMPLEMENT.
 *
 * The console is written against this today so that mainnet day changes only
 * lib/deployments.ts. Changing a signature here means changing the contracts and
 * the design spec together — see
 * docs/superpowers/specs/2026-09-09-app-console-design.md §1 and §5.5.
 */

export const adapterFactoryAbi = [
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'feed', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isDeployed',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'feed', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'feed', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // The factory is immutable and IS the canonical parameter set: adapter
  // addresses depend on (token, feed) alone. The console reads these rather
  // than holding a second copy that could silently drift.
  {
    type: 'function',
    name: 'quietAfter',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protectionBudget',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'continuityBps',
    inputs: [],
    outputs: [{ type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sequencerFeed',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
] as const

export const stockOracleAdapterAbi = [
  {
    type: 'function',
    name: 'latestRoundData',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'status',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'observedAt',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'heldAnswer',
    inputs: [],
    outputs: [{ type: 'int256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protectionEndsAt',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'committedAt',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'valueOf',
    inputs: [{ name: 'rawAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'valueOfUI',
    inputs: [{ name: 'uiAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'commit',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feed',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
] as const
