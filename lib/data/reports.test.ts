import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Supabase server client ─────────────────────────────────────────────
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockRange = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockIs = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

function chainable(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    select: mockSelect,
    eq: mockEq,
    gte: mockGte,
    lte: mockLte,
    is: mockIs,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    ...overrides,
  }
  // Each method returns the same chainable object
  Object.keys(base).forEach(key => {
    if (key !== 'single' && key !== 'maybeSingle') {
      ;(base[key] as ReturnType<typeof vi.fn>).mockReturnValue(base)
    }
  })
  return base
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getAuditLog, getRequestForPDF } from './reports'

// ── getAuditLog ─────────────────────────────────────────────────────────────

describe('getAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array on supabase error', async () => {
    const chain = chainable()
    mockRange.mockResolvedValueOnce({ data: null, count: 0, error: new Error('db error') })
    mockFrom.mockReturnValue(chain)
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getAuditLog({})
    expect(result.data).toEqual([])
    expect(result.count).toBe(0)
  })

  it('maps raw events to AuditLogEntry shape', async () => {
    const rawEvents = [
      {
        id: 'evt-1',
        request_id: 'req-1',
        action: 'approved',
        previous_status: 'pending_l1',
        new_status: 'pending_l2',
        comment: null,
        created_at: '2026-06-11T10:00:00Z',
        approver: { id: 'user-1', full_name: 'Alice Smith' },
        request: { reference_no: 'PR-2026-00001', type: 'purchase_request' },
      },
    ]
    const chain = chainable()
    mockRange.mockResolvedValueOnce({ data: rawEvents, count: 1, error: null })
    mockFrom.mockReturnValue(chain)
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getAuditLog({ page: 1, limit: 50 })
    expect(result.count).toBe(1)
    expect(result.data[0]).toMatchObject({
      id: 'evt-1',
      request_id: 'req-1',
      reference_no: 'PR-2026-00001',
      request_type: 'purchase_request',
      actor_id: 'user-1',
      actor_name: 'Alice Smith',
      action: 'approved',
      previous_status: 'pending_l1',
      new_status: 'pending_l2',
      comment: null,
    })
  })

  it('filters by documentType client-side', async () => {
    const rawEvents = [
      {
        id: 'evt-1', request_id: 'r1', action: 'approved',
        previous_status: null, new_status: null, comment: null,
        created_at: '2026-06-11T10:00:00Z',
        approver: { id: 'u1', full_name: 'Alice' },
        request: { reference_no: 'PR-001', type: 'purchase_request' },
      },
      {
        id: 'evt-2', request_id: 'r2', action: 'submitted',
        previous_status: null, new_status: null, comment: null,
        created_at: '2026-06-11T11:00:00Z',
        approver: { id: 'u2', full_name: 'Bob' },
        request: { reference_no: 'EXP-001', type: 'expense_claim' },
      },
    ]
    const chain = chainable()
    mockRange.mockResolvedValueOnce({ data: rawEvents, count: 2, error: null })
    mockFrom.mockReturnValue(chain)
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getAuditLog({ documentType: 'expense_claim' })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].reference_no).toBe('EXP-001')
  })

  it('handles null approver and request gracefully', async () => {
    const rawEvents = [
      {
        id: 'evt-1', request_id: 'r1', action: 'submitted',
        previous_status: null, new_status: null, comment: null,
        created_at: '2026-06-11T10:00:00Z',
        approver: null,
        request: null,
      },
    ]
    const chain = chainable()
    mockRange.mockResolvedValueOnce({ data: rawEvents, count: 1, error: null })
    mockFrom.mockReturnValue(chain)
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getAuditLog({})
    expect(result.data[0].actor_name).toBe('Unknown')
    expect(result.data[0].reference_no).toBe('')
    expect(result.data[0].request_type).toBe('')
  })
})

// ── getRequestForPDF ─────────────────────────────────────────────────────────

describe('getRequestForPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when request not found', async () => {
    const chain = chainable()
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })
    mockFrom.mockReturnValue(chain)
    // Budget call uses from() too — chain for both
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getRequestForPDF('missing-id')
    expect(result).toBeNull()
  })

  it('returns RequestForPDF with sorted events', async () => {
    const rawRequest = {
      id: 'req-1',
      reference_no: 'PR-2026-00001',
      type: 'purchase_request',
      title: 'Test PR',
      description: 'Desc',
      justification: 'Because',
      amount: 5000,
      currency: 'ZAR',
      category: 'IT Hardware',
      priority: 'normal',
      status: 'approved',
      vendor_name: 'TechCo',
      project_code: 'P-001',
      required_by: '2026-07-01',
      created_at: '2026-06-10T08:00:00Z',
      submitted_at: '2026-06-10T09:00:00Z',
      approved_at: '2026-06-11T10:00:00Z',
      budget_flag: false,
      cost_centre_id: 'cc-1',
      requester: { full_name: 'Jane Doe' },
      cost_centre: { code: 'CC-001', name: 'Operations' },
      approval_events: [
        {
          id: 'evt-2', action: 'approved', previous_status: 'pending_l1',
          new_status: 'approved', comment: 'OK', created_at: '2026-06-11T10:00:00Z', level: 1,
          approver: { full_name: 'Bob Mgr' },
        },
        {
          id: 'evt-1', action: 'submitted', previous_status: null,
          new_status: 'pending_l1', comment: null, created_at: '2026-06-10T09:00:00Z', level: 1,
          approver: { full_name: 'Jane Doe' },
        },
      ],
    }

    const budgetData = { amount: 100000, committed: 5000 }

    const chain = chainable()
    // First from call: spend_requests
    mockSingle.mockResolvedValueOnce({ data: rawRequest, error: null })
    // Second from call: budgets
    mockMaybeSingle.mockResolvedValueOnce({ data: budgetData, error: null })
    mockFrom.mockReturnValue(chain)
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getRequestForPDF('req-1')
    expect(result).not.toBeNull()
    expect(result!.reference_no).toBe('PR-2026-00001')
    expect(result!.requester_name).toBe('Jane Doe')
    expect(result!.cost_centre_code).toBe('CC-001')
    expect(result!.budget_amount).toBe(100000)
    expect(result!.budget_committed).toBe(5000)
    // Events sorted chronologically
    expect(result!.events[0].action).toBe('submitted')
    expect(result!.events[1].action).toBe('approved')
  })

  it('returns null budget fields when no budget row exists', async () => {
    const rawRequest = {
      id: 'req-2', reference_no: 'PR-2026-00002', type: 'purchase_request',
      title: 'T', description: null, justification: null, amount: 1000,
      currency: 'ZAR', category: 'General', priority: 'normal', status: 'submitted',
      vendor_name: null, project_code: null, required_by: null,
      created_at: '2026-06-10T08:00:00Z', submitted_at: null, approved_at: null,
      budget_flag: false, cost_centre_id: 'cc-2',
      requester: { full_name: 'X Y' },
      cost_centre: { code: 'CC-002', name: 'Admin' },
      approval_events: [],
    }
    const chain = chainable()
    mockSingle.mockResolvedValueOnce({ data: rawRequest, error: null })
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

    const result = await getRequestForPDF('req-2')
    expect(result!.budget_amount).toBeNull()
    expect(result!.budget_committed).toBeNull()
  })
})
