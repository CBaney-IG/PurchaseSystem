import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/),
  parent_id: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  parent_id: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
})

describe('create entity validation', () => {
  it('accepts a valid entity', () => {
    const result = createSchema.safeParse({ name: 'BPO Operations', code: 'BPO-OPS' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid entity with parent', () => {
    const result = createSchema.safeParse({
      name: 'Sub Entity',
      code: 'BPO-SUB',
      parent_id: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a code with lowercase letters', () => {
    const result = createSchema.safeParse({ name: 'Test', code: 'bpo-ops' })
    expect(result.success).toBe(false)
  })

  it('rejects a code with spaces', () => {
    const result = createSchema.safeParse({ name: 'Test', code: 'BPO OPS' })
    expect(result.success).toBe(false)
  })

  it('rejects a single-character code', () => {
    const result = createSchema.safeParse({ name: 'Test', code: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty name', () => {
    const result = createSchema.safeParse({ name: '', code: 'BPO-OPS' })
    expect(result.success).toBe(false)
  })

  it('accepts null parent_id (top-level entity)', () => {
    const result = createSchema.safeParse({ name: 'Top Level', code: 'TL-01', parent_id: null })
    expect(result.success).toBe(true)
  })
})

describe('update entity validation', () => {
  it('accepts a name-only update', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Renamed Entity',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an active=false update (deactivation)', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      active: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed code on update', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      code: 'invalid code!',
    })
    expect(result.success).toBe(false)
  })
})
