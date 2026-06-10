import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { levelToStatus, statusToLevel } from './processApproval'
import type { SpendRequestStatus } from '@/types/domain'

// ---- API route Zod schemas (mirrored here for validation tests) ----

const approveSchema = z.object({
  comment: z.string().max(2000).optional().nullable(),
})

const rejectSchema = z.object({
  comment: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(2000),
})

const requestInfoSchema = z.object({
  comment: z.string().min(1, 'A question is required').max(2000),
})

const provideInfoSchema = z.object({
  comment: z.string().min(1, 'Response is required').max(2000),
})

// ---- Helper logic tests ----

describe('levelToStatus', () => {
  it('maps level 1 to pending_l1', () => {
    expect(levelToStatus(1)).toBe('pending_l1')
  })

  it('maps level 2 to pending_l2', () => {
    expect(levelToStatus(2)).toBe('pending_l2')
  })

  it('maps level 3 to pending_l3', () => {
    expect(levelToStatus(3)).toBe('pending_l3')
  })

  it('caps levels above 3 to pending_l3', () => {
    expect(levelToStatus(4)).toBe('pending_l3')
    expect(levelToStatus(6)).toBe('pending_l3')
  })
})

describe('statusToLevel', () => {
  it('maps pending_l1 to 1', () => {
    expect(statusToLevel('pending_l1')).toBe(1)
  })

  it('maps pending_l2 to 2', () => {
    expect(statusToLevel('pending_l2')).toBe(2)
  })

  it('maps pending_l3 to 3', () => {
    expect(statusToLevel('pending_l3')).toBe(3)
  })

  it('returns null for non-pending statuses', () => {
    const nonPending: SpendRequestStatus[] = ['draft', 'approved', 'rejected', 'pending_info', 'cancelled']
    for (const s of nonPending) {
      expect(statusToLevel(s)).toBeNull()
    }
  })
})

// ---- Status transition guard logic ----

function canApproveOrReject(status: SpendRequestStatus): boolean {
  return status.startsWith('pending_l')
}

function canProvideInfo(status: SpendRequestStatus): boolean {
  return status === 'pending_info'
}

describe('status transition guards', () => {
  it('allows approve/reject for pending_l1', () => {
    expect(canApproveOrReject('pending_l1')).toBe(true)
  })

  it('allows approve/reject for pending_l2 and pending_l3', () => {
    expect(canApproveOrReject('pending_l2')).toBe(true)
    expect(canApproveOrReject('pending_l3')).toBe(true)
  })

  it('blocks approve/reject for non-pending statuses', () => {
    const blocked: SpendRequestStatus[] = ['draft', 'approved', 'rejected', 'pending_info', 'cancelled']
    for (const s of blocked) {
      expect(canApproveOrReject(s)).toBe(false)
    }
  })

  it('allows info_provided only when pending_info', () => {
    expect(canProvideInfo('pending_info')).toBe(true)
    expect(canProvideInfo('pending_l1')).toBe(false)
    expect(canProvideInfo('approved')).toBe(false)
  })
})

// ---- API body validation: approve ----

describe('approve request body', () => {
  it('accepts no comment (optional)', () => {
    expect(approveSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a comment', () => {
    expect(approveSchema.safeParse({ comment: 'Looks good.' }).success).toBe(true)
  })

  it('accepts null comment', () => {
    expect(approveSchema.safeParse({ comment: null }).success).toBe(true)
  })
})

// ---- API body validation: reject ----

describe('reject request body', () => {
  it('accepts a comment of at least 10 characters', () => {
    expect(rejectSchema.safeParse({ comment: 'Not approved due to budget.' }).success).toBe(true)
  })

  it('rejects a missing comment', () => {
    expect(rejectSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a comment under 10 characters', () => {
    const result = rejectSchema.safeParse({ comment: 'Too short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('10 characters')
  })

  it('rejects exactly 9 characters', () => {
    expect(rejectSchema.safeParse({ comment: '123456789' }).success).toBe(false)
  })

  it('accepts exactly 10 characters', () => {
    expect(rejectSchema.safeParse({ comment: '1234567890' }).success).toBe(true)
  })
})

// ---- API body validation: request-info ----

describe('request-info body', () => {
  it('accepts a non-empty question', () => {
    expect(requestInfoSchema.safeParse({ comment: 'Please provide the supplier quote.' }).success).toBe(true)
  })

  it('rejects an empty comment', () => {
    expect(requestInfoSchema.safeParse({ comment: '' }).success).toBe(false)
  })

  it('rejects missing comment', () => {
    expect(requestInfoSchema.safeParse({}).success).toBe(false)
  })
})

// ---- API body validation: provide-info ----

describe('provide-info body', () => {
  it('accepts a non-empty response', () => {
    expect(provideInfoSchema.safeParse({ comment: 'Here is the requested quote.' }).success).toBe(true)
  })

  it('rejects an empty response', () => {
    expect(provideInfoSchema.safeParse({ comment: '' }).success).toBe(false)
  })
})
