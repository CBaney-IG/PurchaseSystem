import { describe, it, expect } from 'vitest'
import { transformApprovalEvent, transformBudgetPositions } from './transform'
import type { ApprovalEventRow, SpendRequestRow, BudgetRow } from './transform'

const baseEvent: ApprovalEventRow = {
  id: 'evt-001',
  request_id: 'req-001',
  approver_id: 'usr-001',
  level: 1,
  action: 'approved',
  comment: 'Looks good.',
  previous_status: 'pending_l1',
  new_status: 'approved',
  metadata: null,
  created_at: '2026-06-11T10:00:00Z',
}

const baseRequest: SpendRequestRow = {
  id: 'req-001',
  entity_id: 'ent-001',
  type: 'purchase_request',
  reference_no: 'PR-2026-00001',
  requester_id: 'usr-002',
  cost_centre_id: 'cc-001',
  project_code: 'P-001',
  vendor_id: 'ven-001',
  vendor_name: 'TechCo',
  category: 'IT Hardware',
  title: 'New laptops',
  amount: 15000,
  currency: 'ZAR',
  status: 'approved',
  current_level: 1,
  priority: 'normal',
  required_by: '2026-07-01',
  budget_flag: false,
  submitted_at: '2026-06-10T08:00:00Z',
  approved_at: '2026-06-11T10:00:00Z',
  created_at: '2026-06-10T07:00:00Z',
  updated_at: '2026-06-11T10:00:00Z',
}

const baseBudget: BudgetRow = {
  cost_centre_id: 'cc-001',
  entity_id: 'ent-001',
  cost_centre_code: 'CC-OPS',
  cost_centre_name: 'Operations',
  category: 'IT Hardware',
  period_year: 2026,
  period_month: null,
  amount: 100000,
  committed: 50000,
  actuals: 20000,
  currency: 'ZAR',
}

// ── transformApprovalEvent ────────────────────────────────────────────────────

describe('transformApprovalEvent', () => {
  it('produces the correct event payload shape', () => {
    const result = transformApprovalEvent(baseEvent, baseRequest)

    expect(result.event).toBe('approval_action')
    expect(result.source).toBe('usmp')
    expect(result.FACT_APPROVAL_EVENTS).toMatchObject({
      APPROVAL_EVENT_ID: 'evt-001',
      REQUEST_ID: 'req-001',
      REFERENCE_NO: 'PR-2026-00001',
      APPROVER_ID: 'usr-001',
      ENTITY_ID: 'ent-001',
      LEVEL: 1,
      ACTION: 'approved',
      PREVIOUS_STATUS: 'pending_l1',
      NEW_STATUS: 'approved',
      COMMENT: 'Looks good.',
      EVENT_TIMESTAMP_UTC: '2026-06-11T10:00:00Z',
      METADATA: null,
    })
  })

  it('produces the correct spend request fact', () => {
    const result = transformApprovalEvent(baseEvent, baseRequest)

    expect(result.FACT_SPEND_REQUESTS).toMatchObject({
      REQUEST_ID: 'req-001',
      REFERENCE_NO: 'PR-2026-00001',
      ENTITY_ID: 'ent-001',
      TYPE: 'purchase_request',
      STATUS: 'approved',
      REQUESTER_ID: 'usr-002',
      CATEGORY: 'IT Hardware',
      AMOUNT: 15000,
      CURRENCY: 'ZAR',
      BUDGET_FLAG: false,
    })
  })

  it('coerces amount to a number (handles string-typed DB values)', () => {
    const result = transformApprovalEvent(baseEvent, {
      ...baseRequest,
      amount: '15000.50' as unknown as number,
    })
    expect(result.FACT_SPEND_REQUESTS.AMOUNT).toBe(15000.5)
  })

  it('handles null optional fields gracefully', () => {
    const result = transformApprovalEvent(
      { ...baseEvent, comment: null, metadata: null },
      { ...baseRequest, project_code: null, vendor_id: null, vendor_name: null, approved_at: null }
    )
    expect(result.FACT_APPROVAL_EVENTS.COMMENT).toBeNull()
    expect(result.FACT_SPEND_REQUESTS.PROJECT_CODE).toBeNull()
    expect(result.FACT_SPEND_REQUESTS.VENDOR_NAME).toBeNull()
    expect(result.FACT_SPEND_REQUESTS.APPROVED_AT).toBeNull()
  })

  it('passes metadata through unchanged', () => {
    const meta = { delegated_by: 'usr-003', token_used: true }
    const result = transformApprovalEvent({ ...baseEvent, metadata: meta }, baseRequest)
    expect(result.FACT_APPROVAL_EVENTS.METADATA).toEqual(meta)
  })
})

// ── transformBudgetPositions ──────────────────────────────────────────────────

describe('transformBudgetPositions', () => {
  it('produces the correct payload shape', () => {
    const result = transformBudgetPositions([baseBudget], '2026-06-11T12:00:00Z')

    expect(result.event).toBe('budget_sync')
    expect(result.source).toBe('usmp')
    expect(result.synced_at).toBe('2026-06-11T12:00:00Z')
    expect(result.FACT_BUDGET_POSITIONS).toHaveLength(1)
  })

  it('calculates available amount correctly', () => {
    const [pos] = transformBudgetPositions([baseBudget], '2026-06-11T12:00:00Z')
      .FACT_BUDGET_POSITIONS
    expect(pos.AVAILABLE_AMOUNT).toBe(50000)  // 100000 - 50000
    expect(pos.COMMITTED_AMOUNT).toBe(50000)
    expect(pos.BUDGET_AMOUNT).toBe(100000)
  })

  it('calculates utilisation percentage to 2dp', () => {
    const [pos] = transformBudgetPositions(
      [{ ...baseBudget, amount: 100000, committed: 33333 }],
      '2026-06-11T12:00:00Z'
    ).FACT_BUDGET_POSITIONS
    expect(pos.UTILISATION_PCT).toBe(33.33)
  })

  it('clamps available to 0 when over-committed', () => {
    const [pos] = transformBudgetPositions(
      [{ ...baseBudget, committed: 120000 }],
      '2026-06-11T12:00:00Z'
    ).FACT_BUDGET_POSITIONS
    expect(pos.AVAILABLE_AMOUNT).toBe(0)
  })

  it('returns 0 utilisation when budget amount is 0', () => {
    const [pos] = transformBudgetPositions(
      [{ ...baseBudget, amount: 0, committed: 0 }],
      '2026-06-11T12:00:00Z'
    ).FACT_BUDGET_POSITIONS
    expect(pos.UTILISATION_PCT).toBe(0)
  })

  it('handles an empty budget list', () => {
    const result = transformBudgetPositions([], '2026-06-11T12:00:00Z')
    expect(result.FACT_BUDGET_POSITIONS).toHaveLength(0)
  })

  it('maps monthly budget periods', () => {
    const [pos] = transformBudgetPositions(
      [{ ...baseBudget, period_month: 6 }],
      '2026-06-11T12:00:00Z'
    ).FACT_BUDGET_POSITIONS
    expect(pos.PERIOD_MONTH).toBe(6)
  })
})
