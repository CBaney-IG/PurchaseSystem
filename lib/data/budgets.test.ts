import { describe, it, expect } from 'vitest'
import { z } from 'zod'

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
