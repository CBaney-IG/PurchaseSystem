import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- Zod schemas mirroring API route validation ----

const SPEND_TYPES = ['purchase_request', 'expense_claim'] as const
const PRIORITIES = ['normal', 'urgent'] as const

const createDraftSchema = z
  .object({
    type: z.enum(SPEND_TYPES),
    title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
    category: z.string().min(1, 'Category is required'),
    cost_centre_id: z.string().uuid('Select a cost centre'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    description: z.string().min(20, 'Description must be at least 20 characters').nullable().optional(),
    justification: z.string().nullable().optional(),
    vendor_id: z.string().uuid().nullable().optional(),
    vendor_name: z.string().nullable().optional(),
    project_code: z.string().nullable().optional(),
    required_by: z.string().nullable().optional(),
    priority: z.enum(PRIORITIES).optional().default('normal'),
  })
  .superRefine((data, ctx) => {
    if (data.amount > 5000 && (!data.justification || data.justification.length < 50)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Justification must be at least 50 characters for amounts over R5,000',
        path: ['justification'],
      })
    }
  })

const updateDraftSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  category: z.string().min(1).optional(),
  cost_centre_id: z.string().uuid().optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().min(20).nullable().optional(),
  justification: z.string().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
  project_code: z.string().nullable().optional(),
  required_by: z.string().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
})

// ---- Tests ----

const validBase = {
  type: 'purchase_request' as const,
  title: 'New Laptop',
  category: 'IT Hardware & Software',
  cost_centre_id: '00000000-0000-0000-0000-000000000001',
  amount: 3000,
  description: 'This is a valid description that meets the 20 character minimum.',
}

describe('createDraft validation', () => {
  it('accepts a minimal valid draft', () => {
    expect(createDraftSchema.safeParse(validBase).success).toBe(true)
  })

  it('accepts a full valid draft', () => {
    const result = createDraftSchema.safeParse({
      ...validBase,
      vendor_id: '00000000-0000-0000-0000-000000000002',
      project_code: 'PROJ-001',
      required_by: '2026-07-01',
      priority: 'urgent',
      justification: 'This is needed urgently for the ops team.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const noTitle = {
      type: validBase.type,
      category: validBase.category,
      cost_centre_id: validBase.cost_centre_id,
      amount: validBase.amount,
      description: validBase.description,
    }
    expect(createDraftSchema.safeParse(noTitle).success).toBe(false)
  })

  it('rejects title over 120 characters', () => {
    const result = createDraftSchema.safeParse({ ...validBase, title: 'A'.repeat(121) })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    expect(createDraftSchema.safeParse({ ...validBase, amount: 0 }).success).toBe(false)
  })

  it('rejects negative amount', () => {
    expect(createDraftSchema.safeParse({ ...validBase, amount: -100 }).success).toBe(false)
  })

  it('requires justification of at least 50 chars for amounts over R5,000', () => {
    const result = createDraftSchema.safeParse({
      ...validBase,
      amount: 6000,
      justification: 'Short',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('50 characters')
  })

  it('accepts amount over R5,000 with sufficient justification', () => {
    const result = createDraftSchema.safeParse({
      ...validBase,
      amount: 6000,
      justification: 'This justification is long enough — at least fifty characters here.',
    })
    expect(result.success).toBe(true)
  })

  it('does not require justification for amounts at or under R5,000', () => {
    expect(createDraftSchema.safeParse({ ...validBase, amount: 5000 }).success).toBe(true)
  })

  it('rejects invalid spend type', () => {
    expect(createDraftSchema.safeParse({ ...validBase, type: 'invoice' }).success).toBe(false)
  })

  it('rejects invalid priority', () => {
    expect(createDraftSchema.safeParse({ ...validBase, priority: 'critical' }).success).toBe(false)
  })

  it('rejects non-uuid cost_centre_id', () => {
    expect(createDraftSchema.safeParse({ ...validBase, cost_centre_id: 'not-a-uuid' }).success).toBe(false)
  })
})

describe('updateDraft validation', () => {
  it('accepts a partial update', () => {
    expect(updateDraftSchema.safeParse({ title: 'Updated title' }).success).toBe(true)
  })

  it('accepts an empty object (no-op)', () => {
    expect(updateDraftSchema.safeParse({}).success).toBe(true)
  })

  it('rejects title over 120 chars', () => {
    expect(updateDraftSchema.safeParse({ title: 'B'.repeat(121) }).success).toBe(false)
  })

  it('rejects invalid priority', () => {
    expect(updateDraftSchema.safeParse({ priority: 'low' }).success).toBe(false)
  })
})

describe('ref number formatting', () => {
  function formatRef(prefix: string, year: number, existingCount: number): string {
    const seq = (existingCount + 1).toString().padStart(5, '0')
    return `${prefix}-${year}-${seq}`
  }

  it('formats first PR as PR-2026-00001', () => {
    expect(formatRef('PR', 2026, 0)).toBe('PR-2026-00001')
  })

  it('formats 42nd PR as PR-2026-00042', () => {
    expect(formatRef('PR', 2026, 41)).toBe('PR-2026-00042')
  })

  it('uses EXP prefix for expense claims', () => {
    expect(formatRef('EXP', 2026, 0)).toBe('EXP-2026-00001')
  })
})
