import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- Zod schemas mirroring the API route validation ----

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  budget_owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  entity_id: z.string().uuid().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).optional(),
  budget_owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
})

describe('create cost centre validation', () => {
  it('accepts a minimal valid payload', () => {
    const result = createSchema.safeParse({ code: 'CC-001', name: 'Operations' })
    expect(result.success).toBe(true)
  })

  it('uppercases code gracefully — schema accepts any case', () => {
    const result = createSchema.safeParse({ code: 'cc-001', name: 'Operations' })
    expect(result.success).toBe(true)
  })

  it('accepts optional foreign keys', () => {
    const result = createSchema.safeParse({
      code: 'CC-001',
      name: 'Operations',
      budget_owner_id: '00000000-0000-0000-0000-000000000001',
      parent_id: '00000000-0000-0000-0000-000000000002',
      entity_id: '00000000-0000-0000-0000-000000000003',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for optional FK fields', () => {
    const result = createSchema.safeParse({ code: 'CC-001', name: 'Ops', budget_owner_id: null, parent_id: null })
    expect(result.success).toBe(true)
  })

  it('rejects missing code', () => {
    const result = createSchema.safeParse({ name: 'Operations' })
    expect(result.success).toBe(false)
  })

  it('rejects code longer than 20 chars', () => {
    const result = createSchema.safeParse({ code: 'A'.repeat(21), name: 'Operations' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createSchema.safeParse({ code: 'CC-001' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for budget_owner_id', () => {
    const result = createSchema.safeParse({ code: 'CC-001', name: 'Ops', budget_owner_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('update cost centre validation', () => {
  it('accepts a valid status toggle', () => {
    const result = updateSchema.safeParse({ id: '00000000-0000-0000-0000-000000000001', active: false })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid id', () => {
    const result = updateSchema.safeParse({ id: 'bad-id', name: 'Updated' })
    expect(result.success).toBe(false)
  })

  it('accepts partial update with only name', () => {
    const result = updateSchema.safeParse({ id: '00000000-0000-0000-0000-000000000001', name: 'New Name' })
    expect(result.success).toBe(true)
  })
})
