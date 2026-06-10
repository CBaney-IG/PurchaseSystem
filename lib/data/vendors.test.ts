import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- Zod schemas mirroring the API route validation ----

const VENDOR_STATUSES = ['active', 'inactive', 'pending'] as const

const createSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  category: z.string().min(1, 'Category is required'),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email('Invalid email').nullable().optional(),
  preferred: z.boolean().optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email('Invalid email').nullable().optional(),
  preferred: z.boolean().optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
})

const importRowSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  preferred: z.boolean().optional(),
})

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1),
})

describe('create vendor validation', () => {
  it('accepts a minimal valid payload', () => {
    const result = createSchema.safeParse({ name: 'Acme Ltd', category: 'IT Hardware & Software' })
    expect(result.success).toBe(true)
  })

  it('accepts a full valid payload', () => {
    const result = createSchema.safeParse({
      name: 'Acme Ltd',
      category: 'Professional Services',
      contact_name: 'Jane Smith',
      contact_email: 'jane@acme.com',
      preferred: true,
      status: 'active',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createSchema.safeParse({ category: 'IT Hardware & Software' })
    expect(result.success).toBe(false)
  })

  it('rejects missing category', () => {
    const result = createSchema.safeParse({ name: 'Acme Ltd' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid contact email', () => {
    const result = createSchema.safeParse({
      name: 'Acme Ltd',
      category: 'IT Hardware & Software',
      contact_email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = createSchema.safeParse({
      name: 'Acme Ltd',
      category: 'IT Hardware & Software',
      status: 'archived',
    })
    expect(result.success).toBe(false)
  })
})

describe('update vendor validation', () => {
  it('accepts a valid update', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      preferred: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid id', () => {
    const result = updateSchema.safeParse({ id: 'not-a-uuid', status: 'active' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'deleted',
    })
    expect(result.success).toBe(false)
  })
})

describe('import vendors validation', () => {
  it('accepts valid rows', () => {
    const result = importSchema.safeParse({
      rows: [
        { name: 'Vendor A', category: 'IT Hardware & Software' },
        { name: 'Vendor B', category: 'Professional Services', preferred: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty rows array', () => {
    const result = importSchema.safeParse({ rows: [] })
    expect(result.success).toBe(false)
  })

  it('rejects rows with invalid email', () => {
    const result = importSchema.safeParse({
      rows: [{ name: 'Vendor A', category: 'IT Hardware & Software', contact_email: 'bad' }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts rows with null contact fields', () => {
    const result = importSchema.safeParse({
      rows: [{ name: 'Vendor A', category: 'IT Hardware & Software', contact_name: null, contact_email: null }],
    })
    expect(result.success).toBe(true)
  })
})
