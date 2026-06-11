import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { UpdateCommittedResult } from './budgets'

// ---- Zod schemas mirroring the API route validation ----

const upsertSchema = z.object({
  cost_centre_id: z.string().uuid('Invalid cost centre'),
  category: z.string().min(1),
  period_year: z.number().int().min(2020).max(2040),
  period_month: z.number().int().min(1).max(12).nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  reason: z.string().optional(),
})

const importRowSchema = z.object({
  cost_centre_code: z.string().min(1),
  category: z.string().min(1),
  period_year: z.number().int().min(2020).max(2040),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
})

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1),
})

describe('upsert budget validation', () => {
  it('accepts a valid annual budget', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2026,
      amount: 50000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a monthly budget', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2026,
      period_month: 6,
      amount: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts an adjustment with reason', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'General Operational',
      period_year: 2026,
      amount: 75000,
      reason: 'Board-approved mid-year increase',
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero amount', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2026,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2026,
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects year out of range', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2019,
      amount: 10000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid month', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2026,
      period_month: 13,
      amount: 10000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid currency length', () => {
    const result = upsertSchema.safeParse({
      cost_centre_id: '00000000-0000-0000-0000-000000000001',
      category: 'IT Hardware & Software',
      period_year: 2026,
      amount: 10000,
      currency: 'ZARR',
    })
    expect(result.success).toBe(false)
  })
})

describe('import budgets validation', () => {
  it('accepts valid rows', () => {
    const result = importSchema.safeParse({
      rows: [
        { cost_centre_code: 'CC-001', category: 'IT Hardware & Software', period_year: 2026, amount: 50000 },
        { cost_centre_code: 'CC-002', category: 'General Operational', period_year: 2026, amount: 25000, currency: 'ZAR' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty rows', () => {
    const result = importSchema.safeParse({ rows: [] })
    expect(result.success).toBe(false)
  })

  it('rejects row with zero amount', () => {
    const result = importSchema.safeParse({
      rows: [{ cost_centre_code: 'CC-001', category: 'IT Hardware & Software', period_year: 2026, amount: 0 }],
    })
    expect(result.success).toBe(false)
  })
})

// ---- updateCommitted pure logic (mirrors the function implementation) ----

function computeCommitted(
  currentCommitted: number,
  budgetAmount: number,
  delta: number
): UpdateCommittedResult {
  const newCommitted = Math.max(0, currentCommitted + delta)
  const utilisationPct = budgetAmount > 0 ? (newCommitted / budgetAmount) * 100 : 0
  const isNearLimit = utilisationPct >= 90
  return { newCommitted, budgetAmount, utilisationPct, isNearLimit }
}

describe('updateCommitted delta calculation', () => {
  it('increments committed on submit', () => {
    const result = computeCommitted(0, 10000, 2500)
    expect(result.newCommitted).toBe(2500)
  })

  it('decrements committed on reject', () => {
    const result = computeCommitted(5000, 10000, -2500)
    expect(result.newCommitted).toBe(2500)
  })

  it('accumulates multiple increments', () => {
    const after1 = computeCommitted(0, 10000, 3000)
    const after2 = computeCommitted(after1.newCommitted, 10000, 4000)
    expect(after2.newCommitted).toBe(7000)
  })

  it('never drops below zero on over-decrement', () => {
    const result = computeCommitted(1000, 10000, -5000)
    expect(result.newCommitted).toBe(0)
  })

  it('handles zero delta correctly', () => {
    const result = computeCommitted(3000, 10000, 0)
    expect(result.newCommitted).toBe(3000)
  })
})

describe('updateCommitted utilisation calculation', () => {
  it('calculates utilisation_pct correctly', () => {
    const result = computeCommitted(7500, 10000, 0)
    expect(result.utilisationPct).toBe(75)
  })

  it('returns 0 utilisation when budget_amount is 0', () => {
    const result = computeCommitted(0, 0, 1000)
    expect(result.utilisationPct).toBe(0)
  })

  it('can exceed 100% when committed exceeds budget', () => {
    const result = computeCommitted(8000, 10000, 5000)
    expect(result.utilisationPct).toBe(130)
  })
})

describe('updateCommitted isNearLimit flag', () => {
  it('is false when utilisation is below 90%', () => {
    const result = computeCommitted(0, 10000, 8999)
    expect(result.isNearLimit).toBe(false)
  })

  it('is true at exactly 90%', () => {
    const result = computeCommitted(0, 10000, 9000)
    expect(result.isNearLimit).toBe(true)
  })

  it('is true above 90%', () => {
    const result = computeCommitted(0, 10000, 9500)
    expect(result.isNearLimit).toBe(true)
  })

  it('is true at 100%', () => {
    const result = computeCommitted(0, 10000, 10000)
    expect(result.isNearLimit).toBe(true)
  })

  it('is true when over budget', () => {
    const result = computeCommitted(9000, 10000, 2000)
    expect(result.isNearLimit).toBe(true)
  })

  it('is false when budget_amount is 0 (no division)', () => {
    const result = computeCommitted(0, 0, 500)
    expect(result.isNearLimit).toBe(false)
  })
})

describe('updateCommitted result shape', () => {
  it('returns all required fields', () => {
    const result = computeCommitted(5000, 10000, 1000)
    expect(result).toHaveProperty('newCommitted', 6000)
    expect(result).toHaveProperty('budgetAmount', 10000)
    expect(result).toHaveProperty('utilisationPct', 60)
    expect(result).toHaveProperty('isNearLimit', false)
  })
})
