import { describe, expect, it } from 'vitest'
import { canTransact, resolveDeployment } from '@/lib/deployment-state'

const factory = '0x1111111111111111111111111111111111111111' as const
const deployment = { factory, deployedAtBlock: 42n }

describe('resolveDeployment', () => {
  it('reports an unsupported chain when the config has no entry at all', () => {
    expect(
      resolveDeployment({ deployment: undefined, probeOk: false, probePending: false }),
    ).toEqual({ kind: 'unsupported' })
  })

  it('reports unconfigured when the chain is known but the factory is not deployed', () => {
    expect(resolveDeployment({ deployment: null, probeOk: false, probePending: false })).toEqual({
      kind: 'unconfigured',
    })
  })

  it('reports checking while the probe is in flight', () => {
    expect(resolveDeployment({ deployment, probeOk: false, probePending: true })).toEqual({
      kind: 'checking',
      factory,
    })
  })

  it('reports absent when the config claims a factory the chain does not answer for', () => {
    expect(resolveDeployment({ deployment, probeOk: false, probePending: false })).toEqual({
      kind: 'absent',
      factory,
    })
  })

  it('reports live when the factory answers a view call', () => {
    expect(resolveDeployment({ deployment, probeOk: true, probePending: false })).toEqual({
      kind: 'live',
      factory,
      deployedAtBlock: 42n,
    })
  })
})

describe('canTransact', () => {
  it('permits transactions only against a live factory', () => {
    expect(canTransact({ kind: 'live', factory, deployedAtBlock: 42n })).toBe(true)
    expect(canTransact({ kind: 'absent', factory })).toBe(false)
    expect(canTransact({ kind: 'checking', factory })).toBe(false)
    expect(canTransact({ kind: 'unconfigured' })).toBe(false)
    expect(canTransact({ kind: 'unsupported' })).toBe(false)
  })
})
