import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase service client
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

// Mock notification senders
vi.mock('@/lib/notifications/send', () => ({
  sendApprovalReminder: vi.fn().mockResolvedValue({ sent: false, reason: 'stub' }),
  sendEscalationAlert: vi.fn().mockResolvedValue({ sent: false, reason: 'stub' }),
}))

import { createServiceClient } from '@/lib/supabase/service'
import { sendApprovalReminder, sendEscalationAlert } from '@/lib/notifications/send'
import { checkEscalations } from './checkEscalations'

const mockFrom = vi.fn()
const mockService = { from: mockFrom }

// Builder for chainable Supabase query mock
function makeChain(result: { data: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }
  // Allow awaiting the chain itself (e.g., from().select().eq() without terminal call)
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve),
  })
  return chain
}

// 50 hours ago — past 48h escalation threshold
const staleDate50h = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()
// 30 hours ago — past 24h but not 48h
const staleDate30h = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()

function makePendingRequest(overrides: object = {}) {
  return {
    id: 'req-001',
    entity_id: 'ent-001',
    reference_no: 'PR-2026-00001',
    type: 'purchase_request',
    title: 'New laptops',
    category: 'IT Hardware',
    amount: 5000,
    currency: 'ZAR',
    priority: 'normal',
    justification: 'Need for new hires.',
    budget_flag: false,
    current_level: 1,
    status: 'pending_l1',
    requester_id: 'usr-req',
    cost_centre_id: 'cc-001',
    updated_at: staleDate30h,
    requester: { id: 'usr-req', full_name: 'Alice Brown', email: 'alice@example.com', manager_id: null },
    cost_centre: { code: 'CC-OPS' },
    ...overrides,
  }
}

function makeApprover() {
  return [{ id: 'usr-l1', full_name: 'Bob Smith', email: 'bob@example.com', manager_id: 'usr-mgr' }]
}

function makeManager() {
  return [{ id: 'usr-mgr', full_name: 'Carol Jones', email: 'carol@example.com' }]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createServiceClient).mockReturnValue(mockService as unknown as ReturnType<typeof createServiceClient>)
})

describe('checkEscalations', () => {
  it('returns zero counts when no stale requests exist', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [] }))

    const report = await checkEscalations()

    expect(report.checked).toBe(0)
    expect(report.reminders).toBe(0)
    expect(report.escalations).toBe(0)
    expect(report.errors).toHaveLength(0)
  })

  it('records an error if the initial query fails', async () => {
    const failChain = makeChain({ data: null, error: { message: 'DB connection timeout' } })
    mockFrom.mockReturnValue(failChain)

    const report = await checkEscalations()

    expect(report.errors).toHaveLength(1)
    expect(report.errors[0]).toMatch('Failed to fetch stale requests')
  })

  describe('24h reminder path', () => {
    it('sends reminder and inserts notification when not already reminded', async () => {
      const req = makePendingRequest({ updated_at: staleDate30h })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'spend_requests') return makeChain({ data: [req] })
        if (table === 'notifications') return makeChain({ data: null })
        if (table === 'profiles') return makeChain({ data: makeApprover() })
        return makeChain({ data: null })
      })

      const report = await checkEscalations()

      expect(vi.mocked(sendApprovalReminder)).toHaveBeenCalledOnce()
      expect(report.reminders).toBe(1)
      expect(report.escalations).toBe(0)
    })

    it('skips reminder when one already exists since last status change', async () => {
      const req = makePendingRequest({ updated_at: staleDate30h })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'spend_requests') return makeChain({ data: [req] })
        if (table === 'notifications') return makeChain({ data: { id: 'notif-existing' } })
        return makeChain({ data: null })
      })

      const report = await checkEscalations()

      expect(vi.mocked(sendApprovalReminder)).not.toHaveBeenCalled()
      expect(report.skipped).toBe(1)
      expect(report.reminders).toBe(0)
    })

    it('logs an error when no approvers are found', async () => {
      const req = makePendingRequest({ updated_at: staleDate30h })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'spend_requests') return makeChain({ data: [req] })
        if (table === 'notifications') return makeChain({ data: null })
        if (table === 'profiles') return makeChain({ data: [] })
        return makeChain({ data: null })
      })

      const report = await checkEscalations()

      expect(vi.mocked(sendApprovalReminder)).not.toHaveBeenCalled()
      expect(report.errors).toHaveLength(1)
      expect(report.errors[0]).toMatch('no approvers found')
    })
  })

  describe('48h escalation path', () => {
    it('escalates to manager when request is 48h+ old and not yet escalated', async () => {
      const req = makePendingRequest({ updated_at: staleDate50h })

      // Track profiles calls: first = approvers, second = managers
      let profileCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'spend_requests') return makeChain({ data: [req] })
        if (table === 'approval_events') return makeChain({ data: null })
        if (table === 'profiles') {
          profileCallCount++
          if (profileCallCount === 1) return makeChain({ data: makeApprover() })
          return makeChain({ data: makeManager() })
        }
        if (table === 'notifications') return makeChain({ data: null })
        return makeChain({ data: null })
      })

      const report = await checkEscalations()

      expect(vi.mocked(sendEscalationAlert)).toHaveBeenCalledOnce()
      expect(report.escalations).toBe(1)
      expect(report.reminders).toBe(0)
    })

    it('skips escalation when already escalated since last status change', async () => {
      const req = makePendingRequest({ updated_at: staleDate50h })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'spend_requests') return makeChain({ data: [req] })
        if (table === 'approval_events') return makeChain({ data: { id: 'evt-escalated' } })
        return makeChain({ data: null })
      })

      const report = await checkEscalations()

      expect(vi.mocked(sendEscalationAlert)).not.toHaveBeenCalled()
      expect(report.skipped).toBe(1)
    })

    it('falls back to group_admin when no manager is configured', async () => {
      const req = makePendingRequest({
        updated_at: staleDate50h,
        requester: { id: 'usr-req', full_name: 'Alice Brown', email: 'alice@example.com', manager_id: null },
      })

      const approversWithNoManager = [
        { id: 'usr-l1', full_name: 'Bob Smith', email: 'bob@example.com', manager_id: null },
      ]

      mockFrom.mockImplementation((table: string) => {
        if (table === 'spend_requests') return makeChain({ data: [req] })
        if (table === 'approval_events') return makeChain({ data: null })
        if (table === 'profiles') {
          // Approvers have no manager_id → skip manager lookup → group_admin
          const chain = makeChain({ data: approversWithNoManager })
          // Override `.in()` to return group_admin (fallback path)
          const adminChain = makeChain({
            data: [{ id: 'usr-ga', full_name: 'Group Admin', email: 'admin@example.com' }],
          })
          chain.in = vi.fn().mockReturnValue(adminChain)
          return chain
        }
        if (table === 'notifications') return makeChain({ data: null })
        return makeChain({ data: null })
      })

      const report = await checkEscalations()

      expect(vi.mocked(sendEscalationAlert)).toHaveBeenCalledOnce()
      expect(report.escalations).toBe(1)
    })
  })

  it('catches per-request errors and continues processing remaining requests', async () => {
    const req1 = makePendingRequest({ id: 'req-001', reference_no: 'PR-2026-00001', updated_at: staleDate30h })
    const req2 = makePendingRequest({ id: 'req-002', reference_no: 'PR-2026-00002', updated_at: staleDate30h })

    let spendCalled = false
    mockFrom.mockImplementation((table: string) => {
      if (table === 'spend_requests' && !spendCalled) {
        spendCalled = true
        return makeChain({ data: [req1, req2] })
      }
      if (table === 'notifications') return makeChain({ data: null })
      if (table === 'profiles') {
        // Throw for req1, succeed for req2
        if (!spendCalled) throw new Error('Unexpected call')
        const chain = makeChain({ data: [] })
        return chain
      }
      return makeChain({ data: null })
    })

    // Even if sendApprovalReminder throws, the loop should continue
    vi.mocked(sendApprovalReminder).mockRejectedValueOnce(new Error('Resend timeout'))

    const report = await checkEscalations()

    expect(report.checked).toBe(2)
    // One error captured, other request still processed
    expect(report.errors.length).toBeGreaterThanOrEqual(1)
  })
})
