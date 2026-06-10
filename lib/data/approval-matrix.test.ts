import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { getRequiredLevels, getNextRequiredLevel } from '@/lib/approvals/matrix'
import type { MatrixEntry } from '@/lib/approvals/matrix'

// ---- Zod schemas mirroring the API route validation ----

const USER_ROLES = [
  'requester', 'approver_l1', 'approver_l2', 'approver_l3',
  'procurement_officer', 'finance', 'admin', 'group_admin',
] as const

const createSchema = z.object({
  category: z.string().min(1),
  level: z.number().int().min(1).max(6),
  min_amount: z.number().min(0),
  max_amount: z.number().positive().nullable(),
  approver_role: z.enum(USER_ROLES),
  require_all: z.boolean().optional(),
  escalate_hours: z.number().int().min(1).optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().positive().nullable().optional(),
  approver_role: z.enum(USER_ROLES).optional(),
  require_all: z.boolean().optional(),
  escalate_hours: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
})

// Standard IT Hardware matrix from seed data
const IT_MATRIX: MatrixEntry[] = [
  { level: 1, min_amount: 0,     max_amount: 5000,  approver_role: 'approver_l1', require_all: false, escalate_hours: 48 },
  { level: 2, min_amount: 5000,  max_amount: 25000, approver_role: 'approver_l2', require_all: false, escalate_hours: 48 },
  { level: 3, min_amount: 25000, max_amount: null,  approver_role: 'approver_l3', require_all: false, escalate_hours: 48 },
]

describe('getRequiredLevels — routing logic (AC-02)', () => {
  it('routes R3,000 to L1 only', () => {
    const result = getRequiredLevels(IT_MATRIX, 3000)
    expect(result.map((e) => e.level)).toEqual([1])
  })

  it('routes R5,000 (exact boundary) to L1 only', () => {
    const result = getRequiredLevels(IT_MATRIX, 5000)
    expect(result.map((e) => e.level)).toEqual([1])
  })

  it('routes R6,000 to L1 and L2 (AC-02)', () => {
    const result = getRequiredLevels(IT_MATRIX, 6000)
    expect(result.map((e) => e.level)).toEqual([1, 2])
  })

  it('routes R25,000 (exact L2 boundary) to L1 and L2', () => {
    const result = getRequiredLevels(IT_MATRIX, 25000)
    expect(result.map((e) => e.level)).toEqual([1, 2])
  })

  it('routes R30,000 to all three levels', () => {
    const result = getRequiredLevels(IT_MATRIX, 30000)
    expect(result.map((e) => e.level)).toEqual([1, 2, 3])
  })

  it('routes R500,000 to all three levels (unlimited ceiling)', () => {
    const result = getRequiredLevels(IT_MATRIX, 500000)
    expect(result.map((e) => e.level)).toEqual([1, 2, 3])
  })

  it('skips inactive levels', () => {
    const matrix: MatrixEntry[] = [
      { ...IT_MATRIX[0] },
      { ...IT_MATRIX[1], active: false },
      { ...IT_MATRIX[2] },
    ]
    const result = getRequiredLevels(matrix, 30000)
    expect(result.map((e) => e.level)).toEqual([1, 3])
  })

  it('returns empty array for empty matrix', () => {
    const result = getRequiredLevels([], 10000)
    expect(result).toEqual([])
  })
})

describe('getNextRequiredLevel', () => {
  it('returns L2 when at L1 for R6,000 (mid-chain)', () => {
    const next = getNextRequiredLevel(IT_MATRIX, 1, 6000)
    expect(next?.level).toBe(2)
  })

  it('returns null when at L1 for R3,000 (single level sufficient)', () => {
    const next = getNextRequiredLevel(IT_MATRIX, 1, 3000)
    expect(next).toBeNull()
  })

  it('returns null when at L3 for any amount (final level)', () => {
    const next = getNextRequiredLevel(IT_MATRIX, 3, 500000)
    expect(next).toBeNull()
  })

  it('returns L3 when at L2 for R30,000', () => {
    const next = getNextRequiredLevel(IT_MATRIX, 2, 30000)
    expect(next?.level).toBe(3)
  })
})

describe('create matrix cell validation', () => {
  it('accepts a valid new cell', () => {
    const result = createSchema.safeParse({
      category: 'IT Hardware & Software',
      level: 1,
      min_amount: 0,
      max_amount: 5000,
      approver_role: 'approver_l1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null max_amount (no upper limit)', () => {
    const result = createSchema.safeParse({
      category: 'IT Hardware & Software',
      level: 3,
      min_amount: 25000,
      max_amount: null,
      approver_role: 'approver_l3',
    })
    expect(result.success).toBe(true)
  })

  it('rejects level > 6', () => {
    const result = createSchema.safeParse({
      category: 'IT Hardware & Software',
      level: 7,
      min_amount: 0,
      max_amount: 5000,
      approver_role: 'approver_l1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = createSchema.safeParse({
      category: 'IT Hardware & Software',
      level: 1,
      min_amount: 0,
      max_amount: 5000,
      approver_role: 'superadmin',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative min_amount', () => {
    const result = createSchema.safeParse({
      category: 'IT Hardware & Software',
      level: 1,
      min_amount: -100,
      max_amount: 5000,
      approver_role: 'approver_l1',
    })
    expect(result.success).toBe(false)
  })
})

describe('update matrix cell validation', () => {
  it('accepts a partial update', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      max_amount: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts deactivating a cell', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      active: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid id', () => {
    const result = updateSchema.safeParse({ id: 'bad', active: false })
    expect(result.success).toBe(false)
  })
})
