import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- API-route schemas (mirrored for validation tests) ----

const createSchema = z.object({
  delegate_id: z.string().uuid(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  reason: z.string().max(500).optional().nullable(),
})

const deleteSchema = z.object({
  delegation_id: z.string().uuid(),
})

// ---- Validation logic mirroring createDelegation() guards ----

function validateDelegation({
  delegatorId,
  delegateId,
  validFrom,
  validUntil,
}: {
  delegatorId: string
  delegateId: string
  validFrom: string
  validUntil: string
}): string | null {
  if (delegatorId === delegateId) return 'You cannot delegate to yourself'
  if (new Date(validUntil) <= new Date(validFrom)) return 'valid_until must be after valid_from'
  return null
}

function delegationsOverlap(
  existingFrom: string,
  existingUntil: string,
  newFrom: string,
  newUntil: string,
): boolean {
  return new Date(existingFrom) < new Date(newUntil) && new Date(existingUntil) > new Date(newFrom)
}

// ---- Schema tests ----

describe('delegation create API schema', () => {
  it('accepts a valid delegation', () => {
    const result = createSchema.safeParse({
      delegate_id: '00000000-0000-0000-0000-000000000002',
      valid_from: '2026-06-20T00:00:00.000Z',
      valid_until: '2026-06-27T23:59:59.000Z',
      reason: 'Annual leave',
    })
    expect(result.success).toBe(true)
  })

  it('accepts delegation without reason', () => {
    const result = createSchema.safeParse({
      delegate_id: '00000000-0000-0000-0000-000000000002',
      valid_from: '2026-06-20T00:00:00.000Z',
      valid_until: '2026-06-27T23:59:59.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid delegate_id', () => {
    const result = createSchema.safeParse({
      delegate_id: 'not-a-uuid',
      valid_from: '2026-06-20T00:00:00.000Z',
      valid_until: '2026-06-27T23:59:59.000Z',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-datetime valid_from', () => {
    const result = createSchema.safeParse({
      delegate_id: '00000000-0000-0000-0000-000000000002',
      valid_from: '2026-06-20',   // date only, not datetime
      valid_until: '2026-06-27T23:59:59.000Z',
    })
    expect(result.success).toBe(false)
  })

  it('rejects reason longer than 500 chars', () => {
    const result = createSchema.safeParse({
      delegate_id: '00000000-0000-0000-0000-000000000002',
      valid_from: '2026-06-20T00:00:00.000Z',
      valid_until: '2026-06-27T23:59:59.000Z',
      reason: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe('delegation delete API schema', () => {
  it('accepts a valid delegation_id', () => {
    const result = deleteSchema.safeParse({
      delegation_id: '00000000-0000-0000-0000-000000000099',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing delegation_id', () => {
    const result = deleteSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-uuid delegation_id', () => {
    const result = deleteSchema.safeParse({ delegation_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

// ---- Business rule tests ----

describe('delegation creation guard logic', () => {
  const DELEGATOR = '00000000-0000-0000-0000-000000000001'
  const DELEGATE = '00000000-0000-0000-0000-000000000002'

  it('rejects self-delegation', () => {
    const error = validateDelegation({
      delegatorId: DELEGATOR,
      delegateId: DELEGATOR,
      validFrom: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-27T00:00:00Z',
    })
    expect(error).toMatch(/yourself/)
  })

  it('rejects when valid_until equals valid_from', () => {
    const error = validateDelegation({
      delegatorId: DELEGATOR,
      delegateId: DELEGATE,
      validFrom: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-20T00:00:00Z',
    })
    expect(error).toMatch(/after/)
  })

  it('rejects when valid_until is before valid_from', () => {
    const error = validateDelegation({
      delegatorId: DELEGATOR,
      delegateId: DELEGATE,
      validFrom: '2026-06-27T00:00:00Z',
      validUntil: '2026-06-20T00:00:00Z',
    })
    expect(error).toMatch(/after/)
  })

  it('passes valid delegation', () => {
    const error = validateDelegation({
      delegatorId: DELEGATOR,
      delegateId: DELEGATE,
      validFrom: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-27T00:00:00Z',
    })
    expect(error).toBeNull()
  })
})

describe('delegation overlap detection', () => {
  // existing: 15 Jun → 22 Jun
  const existingFrom = '2026-06-15T00:00:00Z'
  const existingUntil = '2026-06-22T23:59:59Z'

  it('detects full overlap — new entirely inside existing', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-16T00:00:00Z', '2026-06-20T00:00:00Z')).toBe(true)
  })

  it('detects partial overlap — new starts inside existing', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-18T00:00:00Z', '2026-06-25T00:00:00Z')).toBe(true)
  })

  it('detects partial overlap — new ends inside existing', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-10T00:00:00Z', '2026-06-17T00:00:00Z')).toBe(true)
  })

  it('detects full overlap — new entirely covers existing', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-10T00:00:00Z', '2026-06-30T00:00:00Z')).toBe(true)
  })

  it('does not flag gap after existing ends', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-23T00:00:00Z', '2026-06-30T00:00:00Z')).toBe(false)
  })

  it('does not flag gap before existing starts', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-01T00:00:00Z', '2026-06-14T00:00:00Z')).toBe(false)
  })

  it('treats adjacent ranges (new ends exactly when existing starts) as non-overlapping', () => {
    expect(delegationsOverlap(existingFrom, existingUntil, '2026-06-10T00:00:00Z', '2026-06-15T00:00:00Z')).toBe(false)
  })
})
