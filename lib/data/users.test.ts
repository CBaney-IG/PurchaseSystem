import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- Shared Zod schemas (extracted here so tests match API validation) ----

const USER_ROLES = [
  'requester',
  'approver_l1',
  'approver_l2',
  'approver_l3',
  'procurement_officer',
  'finance',
  'admin',
  'group_admin',
] as const

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  entity_id: z.string().uuid(),
  role: z.enum(USER_ROLES),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(USER_ROLES).optional(),
  entity_id: z.string().uuid().optional(),
  active: z.boolean().optional(),
  approver_limit: z.number().nonnegative().optional(),
})

describe('invite user validation', () => {
  it('accepts a valid invite payload', () => {
    const result = inviteSchema.safeParse({
      email: 'jane@bpogroup.co.za',
      full_name: 'Jane Smith',
      entity_id: '00000000-0000-0000-0000-000000000001',
      role: 'requester',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = inviteSchema.safeParse({
      email: 'not-an-email',
      full_name: 'Jane Smith',
      entity_id: '00000000-0000-0000-0000-000000000001',
      role: 'requester',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty full_name', () => {
    const result = inviteSchema.safeParse({
      email: 'jane@bpogroup.co.za',
      full_name: '',
      entity_id: '00000000-0000-0000-0000-000000000001',
      role: 'requester',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a non-UUID entity_id', () => {
    const result = inviteSchema.safeParse({
      email: 'jane@bpogroup.co.za',
      full_name: 'Jane Smith',
      entity_id: 'not-a-uuid',
      role: 'requester',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown role', () => {
    const result = inviteSchema.safeParse({
      email: 'jane@bpogroup.co.za',
      full_name: 'Jane Smith',
      entity_id: '00000000-0000-0000-0000-000000000001',
      role: 'superuser',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all 8 valid roles', () => {
    for (const role of USER_ROLES) {
      const result = inviteSchema.safeParse({
        email: 'test@bpogroup.co.za',
        full_name: 'Test User',
        entity_id: '00000000-0000-0000-0000-000000000001',
        role,
      })
      expect(result.success, `role ${role} should be valid`).toBe(true)
    }
  })
})

describe('update user validation', () => {
  it('accepts a role-only update', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      role: 'approver_l2',
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

  it('rejects negative approver_limit', () => {
    const result = updateSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      approver_limit: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing id', () => {
    const result = updateSchema.safeParse({ role: 'admin' })
    expect(result.success).toBe(false)
  })
})

// ---- Role-based access control logic (mirrors API route checks) ----

type CallerRole = 'admin' | 'group_admin'

function canInviteToEntity(
  callerRole: CallerRole,
  callerEntityId: string,
  targetEntityId: string
): boolean {
  if (callerRole === 'group_admin') return true
  return callerEntityId === targetEntityId
}

describe('admin role access control', () => {
  const ENTITY_A = '00000000-0000-0000-0000-000000000001'
  const ENTITY_B = '00000000-0000-0000-0000-000000000002'

  it('admin can invite to their own entity', () => {
    expect(canInviteToEntity('admin', ENTITY_A, ENTITY_A)).toBe(true)
  })

  it('admin cannot invite to a different entity', () => {
    expect(canInviteToEntity('admin', ENTITY_A, ENTITY_B)).toBe(false)
  })

  it('group_admin can invite to any entity', () => {
    expect(canInviteToEntity('group_admin', ENTITY_A, ENTITY_B)).toBe(true)
    expect(canInviteToEntity('group_admin', ENTITY_A, ENTITY_A)).toBe(true)
  })
})
