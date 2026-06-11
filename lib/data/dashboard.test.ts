import { describe, it, expect } from 'vitest'
import type { DashboardMetrics, OverBudgetCostCentre } from './dashboard'

// ---- Pure computation helpers (mirrors dashboard.ts logic) ----

function computeBudgetUtilisation(
  budgets: { amount: number; committed: number; actuals: number }[]
): { utilisationPct: number | null; ytdActuals: number; ytdBudget: number } {
  if (budgets.length === 0) {
    return { utilisationPct: null, ytdActuals: 0, ytdBudget: 0 }
  }
  const totalAmount = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalCommitted = budgets.reduce((sum, b) => sum + b.committed, 0)
  const ytdActuals = budgets.reduce((sum, b) => sum + b.actuals, 0)
  const utilisationPct = totalAmount > 0 ? (totalCommitted / totalAmount) * 100 : null
  return { utilisationPct, ytdActuals, ytdBudget: totalAmount }
}

function isNearOrOverBudget(committed: number, amount: number): boolean {
  if (amount <= 0) return false
  return (committed / amount) * 100 >= 90
}

function utilisationColor(pct: number | null): string {
  if (pct === null) return 'text-slate-400'
  if (pct >= 90) return 'text-red-600'
  if (pct >= 75) return 'text-amber-600'
  return 'text-green-700'
}

function computeYtdPct(actuals: number, budget: number): number | null {
  if (budget <= 0) return null
  return (actuals / budget) * 100
}

// ---- computeBudgetUtilisation ----

describe('computeBudgetUtilisation', () => {
  it('returns null utilisationPct for empty list', () => {
    const result = computeBudgetUtilisation([])
    expect(result.utilisationPct).toBeNull()
    expect(result.ytdActuals).toBe(0)
    expect(result.ytdBudget).toBe(0)
  })

  it('calculates utilisation for a single budget at 50%', () => {
    const result = computeBudgetUtilisation([
      { amount: 100000, committed: 50000, actuals: 40000 },
    ])
    expect(result.utilisationPct).toBe(50)
  })

  it('aggregates multiple budgets correctly', () => {
    const result = computeBudgetUtilisation([
      { amount: 100000, committed: 60000, actuals: 20000 },
      { amount: 50000, committed: 20000, actuals: 10000 },
    ])
    // (80000 / 150000) * 100 = 53.33...
    expect(result.utilisationPct).toBeCloseTo(53.33, 1)
  })

  it('returns null utilisationPct when totalAmount is zero', () => {
    const result = computeBudgetUtilisation([
      { amount: 0, committed: 0, actuals: 0 },
    ])
    expect(result.utilisationPct).toBeNull()
  })

  it('sums ytdActuals across all budgets', () => {
    const result = computeBudgetUtilisation([
      { amount: 100000, committed: 50000, actuals: 30000 },
      { amount: 50000, committed: 20000, actuals: 15000 },
    ])
    expect(result.ytdActuals).toBe(45000)
  })

  it('sums ytdBudget across all budgets', () => {
    const result = computeBudgetUtilisation([
      { amount: 100000, committed: 50000, actuals: 30000 },
      { amount: 75000, committed: 20000, actuals: 10000 },
    ])
    expect(result.ytdBudget).toBe(175000)
  })
})

// ---- isNearOrOverBudget ----

describe('isNearOrOverBudget', () => {
  it('is true at exactly 90%', () => {
    expect(isNearOrOverBudget(9000, 10000)).toBe(true)
  })

  it('is true above 90%', () => {
    expect(isNearOrOverBudget(9500, 10000)).toBe(true)
  })

  it('is false below 90%', () => {
    expect(isNearOrOverBudget(8999, 10000)).toBe(false)
  })

  it('is false when amount is zero', () => {
    expect(isNearOrOverBudget(1000, 0)).toBe(false)
  })

  it('is true when committed exceeds budget (over 100%)', () => {
    expect(isNearOrOverBudget(12000, 10000)).toBe(true)
  })
})

// ---- utilisationColor ----

describe('utilisationColor', () => {
  it('returns slate for null', () => {
    expect(utilisationColor(null)).toBe('text-slate-400')
  })

  it('returns green below 75%', () => {
    expect(utilisationColor(50)).toBe('text-green-700')
    expect(utilisationColor(74.9)).toBe('text-green-700')
  })

  it('returns amber between 75% and 89%', () => {
    expect(utilisationColor(75)).toBe('text-amber-600')
    expect(utilisationColor(89.9)).toBe('text-amber-600')
  })

  it('returns red at 90% or above', () => {
    expect(utilisationColor(90)).toBe('text-red-600')
    expect(utilisationColor(120)).toBe('text-red-600')
  })
})

// ---- computeYtdPct ----

describe('computeYtdPct', () => {
  it('calculates percentage correctly', () => {
    expect(computeYtdPct(75000, 150000)).toBe(50)
  })

  it('returns null when budget is zero', () => {
    expect(computeYtdPct(5000, 0)).toBeNull()
  })

  it('can exceed 100% when actuals exceed budget', () => {
    expect(computeYtdPct(110000, 100000)).toBeCloseTo(110, 5)
  })
})

// ---- Type shape checks ----

describe('DashboardMetrics type shape', () => {
  it('satisfies the expected shape', () => {
    const metrics: DashboardMetrics = {
      myPendingCount: 3,
      pendingMyApprovalCount: 7,
      entityBudgetUtilisationPct: 67.5,
      ytdActuals: 200000,
      ytdBudget: 500000,
    }
    expect(metrics.myPendingCount).toBe(3)
    expect(metrics.entityBudgetUtilisationPct).toBeCloseTo(67.5)
  })

  it('allows null for entityBudgetUtilisationPct when no budgets configured', () => {
    const metrics: DashboardMetrics = {
      myPendingCount: 0,
      pendingMyApprovalCount: 0,
      entityBudgetUtilisationPct: null,
      ytdActuals: 0,
      ytdBudget: 0,
    }
    expect(metrics.entityBudgetUtilisationPct).toBeNull()
  })
})

describe('OverBudgetCostCentre type shape', () => {
  it('satisfies the expected shape', () => {
    const cc: OverBudgetCostCentre = {
      id: 'cc-uuid',
      code: 'CC-OPS-01',
      name: 'Operations',
      utilisationPct: 95.2,
      committed: 95200,
      amount: 100000,
      category: 'IT Hardware & Software',
    }
    expect(cc.utilisationPct).toBeGreaterThanOrEqual(90)
  })
})
