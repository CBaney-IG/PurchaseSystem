import { describe, it, expect } from 'vitest'

function formatRefNumber(prefix: string, year: number, existingCount: number): string {
  const seq = (existingCount + 1).toString().padStart(5, '0')
  return `${prefix}-${year}-${seq}`
}

describe('reference number formatting', () => {
  it('generates PR-2026-00001 for first PR', () => {
    expect(formatRefNumber('PR', 2026, 0)).toBe('PR-2026-00001')
  })

  it('generates PR-2026-00042 for 42nd PR', () => {
    expect(formatRefNumber('PR', 2026, 41)).toBe('PR-2026-00042')
  })

  it('generates EXP prefix for expense claims', () => {
    expect(formatRefNumber('EXP', 2026, 0)).toBe('EXP-2026-00001')
  })

  it('pads single digit sequence to 5 digits', () => {
    expect(formatRefNumber('PR', 2026, 4)).toBe('PR-2026-00005')
  })

  it('handles large sequences beyond 5 digits', () => {
    expect(formatRefNumber('PR', 2026, 99999)).toBe('PR-2026-100000')
  })

  it('uses correct year', () => {
    expect(formatRefNumber('PR', 2027, 0)).toBe('PR-2027-00001')
  })
})
