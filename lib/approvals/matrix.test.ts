import { describe, it, expect } from 'vitest'
import { getRequiredLevels, getNextRequiredLevel } from './matrix'
import type { MatrixEntry } from './matrix'

const IT_HARDWARE: MatrixEntry[] = [
  { level: 1, min_amount: 0,     max_amount: 5000,  approver_role: 'approver_l1', require_all: false, escalate_hours: 48 },
  { level: 2, min_amount: 5000,  max_amount: 25000, approver_role: 'approver_l2', require_all: false, escalate_hours: 48 },
  { level: 3, min_amount: 25000, max_amount: null,  approver_role: 'approver_l3', require_all: false, escalate_hours: 48 },
]

const GENERAL_OPS: MatrixEntry[] = [
  { level: 1, min_amount: 0,    max_amount: 2500,  approver_role: 'approver_l1', require_all: false, escalate_hours: 48 },
  { level: 2, min_amount: 2500, max_amount: 10000, approver_role: 'approver_l2', require_all: false, escalate_hours: 48 },
  { level: 3, min_amount: 10000, max_amount: null, approver_role: 'approver_l3', require_all: false, escalate_hours: 48 },
]

describe('getRequiredLevels', () => {
  it('returns only L1 for an amount within L1 ceiling', () => {
    expect(getRequiredLevels(IT_HARDWARE, 3000).map(e => e.level)).toEqual([1])
  })

  it('returns L1 and L2 for an amount above L1 but within L2 ceiling (AC-02: R6,000 IT Hardware)', () => {
    expect(getRequiredLevels(IT_HARDWARE, 6000).map(e => e.level)).toEqual([1, 2])
  })

  it('returns all three levels for an amount above L2 ceiling', () => {
    expect(getRequiredLevels(IT_HARDWARE, 30000).map(e => e.level)).toEqual([1, 2, 3])
  })

  it('treats exactly-at-L1-ceiling as L1 only', () => {
    expect(getRequiredLevels(IT_HARDWARE, 5000).map(e => e.level)).toEqual([1])
  })

  it('treats one above L1 ceiling as requiring L2', () => {
    expect(getRequiredLevels(IT_HARDWARE, 5001).map(e => e.level)).toEqual([1, 2])
  })

  it('returns L1 only for a small General Operational request', () => {
    expect(getRequiredLevels(GENERAL_OPS, 1000).map(e => e.level)).toEqual([1])
  })

  it('skips inactive entries and continues to next active level', () => {
    // If L2 is inactive, amounts exceeding L1 escalate directly to L3
    const withInactive = IT_HARDWARE.map(e =>
      e.level === 2 ? { ...e, active: false } : e
    )
    expect(getRequiredLevels(withInactive, 6000).map(e => e.level)).toEqual([1, 3])
  })
})

describe('getNextRequiredLevel', () => {
  it('returns L2 after L1 approves a R6,000 IT Hardware request (AC-02)', () => {
    expect(getNextRequiredLevel(IT_HARDWARE, 1, 6000)?.level).toBe(2)
  })

  it('returns null when the final required level has approved', () => {
    expect(getNextRequiredLevel(IT_HARDWARE, 2, 6000)).toBeNull()
  })

  it('returns L2 after L1 for a high-value request', () => {
    expect(getNextRequiredLevel(IT_HARDWARE, 1, 30000)?.level).toBe(2)
  })

  it('returns L3 after L2 for a high-value request', () => {
    expect(getNextRequiredLevel(IT_HARDWARE, 2, 30000)?.level).toBe(3)
  })

  it('returns null after all levels satisfied', () => {
    expect(getNextRequiredLevel(IT_HARDWARE, 3, 30000)).toBeNull()
  })

  it('returns null for a small request where only L1 was needed', () => {
    expect(getNextRequiredLevel(IT_HARDWARE, 1, 3000)).toBeNull()
  })
})
