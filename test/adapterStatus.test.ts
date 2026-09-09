import { describe, expect, it } from 'vitest'
import {
  ADAPTER_STATUSES,
  ADAPTER_STATUS_LABEL,
  ADAPTER_STATUS_NOTE,
  adapterStatusFromEnum,
} from '@/lib/adapterStatus'

describe('adapterStatusFromEnum', () => {
  it('maps the Solidity enum by declaration order', () => {
    expect(adapterStatusFromEnum(0)).toBe('NORMAL')
    expect(adapterStatusFromEnum(3)).toBe('DESYNC')
    expect(adapterStatusFromEnum(6)).toBe('UNSAFE')
  })

  it('returns null for a value the interface does not define', () => {
    expect(adapterStatusFromEnum(7)).toBeNull()
    expect(adapterStatusFromEnum(-1)).toBeNull()
  })
})

describe('status vocabulary', () => {
  it('gives every status a label and a note', () => {
    for (const status of ADAPTER_STATUSES) {
      expect(ADAPTER_STATUS_LABEL[status]).toBeTruthy()
      expect(ADAPTER_STATUS_NOTE[status]).toBeTruthy()
    }
  })

  it('covers all seven states of the interface', () => {
    expect(ADAPTER_STATUSES).toHaveLength(7)
  })
})
