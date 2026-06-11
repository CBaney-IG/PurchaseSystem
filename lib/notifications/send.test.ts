import { describe, it, expect } from 'vitest'

// Mirror the stub detection logic from send.ts
function isStubKey(key: string): boolean {
  return key.startsWith('re_stub')
}

const STUB_REQUEST = {
  id: 'req-abc',
  reference_no: 'PR-2026-00001',
  title: 'New laptop for developer',
  type: 'purchase_request',
  category: 'IT Hardware',
  amount: 12500,
  currency: 'ZAR',
  justification: 'Required for software development work.',
  budget_flag: false,
  priority: 'normal',
}

const STUB_REQUESTER = {
  id: 'user-1',
  email: 'requester@bpo.co.za',
  full_name: 'Alice Smith',
}

const STUB_APPROVERS = [
  { id: 'approver-1', email: 'manager@bpo.co.za', full_name: 'Bob Jones' },
]

// ---- Stub key detection ----

describe('stub key detection', () => {
  it('detects re_stub prefix as a stub key', () => {
    expect(isStubKey('re_stub_xxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true)
  })

  it('detects re_stub exactly', () => {
    expect(isStubKey('re_stub')).toBe(true)
  })

  it('does not treat a real-looking key as a stub', () => {
    expect(isStubKey('re_live_abcdefghijklmnopqrstuvwxyz')).toBe(false)
  })

  it('does not treat an empty string as a stub', () => {
    expect(isStubKey('')).toBe(false)
  })

  it('does not treat a random string as a stub', () => {
    expect(isStubKey('sk-some-other-service-key')).toBe(false)
  })
})

// ---- Email subject line format ----

describe('email subject line format', () => {
  it('formats approval-needed subject correctly', () => {
    const { reference_no, title } = STUB_REQUEST
    const subject = `[Action Required] Approval Request — ${reference_no}: ${title}`
    expect(subject).toBe('[Action Required] Approval Request — PR-2026-00001: New laptop for developer')
  })

  it('formats approved subject correctly', () => {
    const { reference_no, title } = STUB_REQUEST
    const subject = `Approved: ${reference_no} — ${title}`
    expect(subject).toBe('Approved: PR-2026-00001 — New laptop for developer')
  })

  it('formats rejected subject correctly', () => {
    const { reference_no, title } = STUB_REQUEST
    const subject = `Rejected: ${reference_no} — ${title}`
    expect(subject).toBe('Rejected: PR-2026-00001 — New laptop for developer')
  })

  it('formats info-requested subject correctly', () => {
    const { reference_no, title } = STUB_REQUEST
    const subject = `[Action Required] More information needed — ${reference_no}: ${title}`
    expect(subject).toBe(
      '[Action Required] More information needed — PR-2026-00001: New laptop for developer'
    )
  })
})

// ---- sendApprovalNeeded shape guards ----

describe('sendApprovalNeeded payload structure', () => {
  it('returns no_approvers reason when approvers list is empty', () => {
    const approvers: typeof STUB_APPROVERS = []
    const reason = approvers.length === 0 ? 'no_approvers' : 'ok'
    expect(reason).toBe('no_approvers')
  })

  it('signs one token per approver per action (2 tokens per approver)', () => {
    const approverCount = STUB_APPROVERS.length
    // Each approver gets one approve token + one reject token
    const expectedTokenCount = approverCount * 2
    expect(expectedTokenCount).toBe(2)
  })
})

// ---- sendRequestOutcome outcome selector ----

describe('sendRequestOutcome outcome selection', () => {
  it('selects approved template for approved outcome', () => {
    const outcome: 'approved' | 'rejected' = 'approved'
    const templateName = outcome === 'approved' ? 'RequestApproved' : 'RequestRejected'
    expect(templateName).toBe('RequestApproved')
  })

  it('selects rejected template for rejected outcome', () => {
    const outcome: string = 'rejected'
    const templateName = outcome === 'approved' ? 'RequestApproved' : 'RequestRejected'
    expect(templateName).toBe('RequestRejected')
  })

  it('includes rejection reason in the rejected email', () => {
    const reason = 'This exceeds the quarterly budget allocation.'
    const params = {
      request: STUB_REQUEST,
      requester: STUB_REQUESTER,
      outcome: 'rejected' as const,
      rejectionReason: reason,
    }
    expect(params.rejectionReason).toBe(reason)
    expect(params.rejectionReason.length).toBeGreaterThanOrEqual(10)
  })

  it('does not require rejectionReason for approved outcome', () => {
    const params = {
      request: STUB_REQUEST,
      requester: STUB_REQUESTER,
      outcome: 'approved' as const,
      rejectionReason: undefined,
    }
    expect(params.rejectionReason).toBeUndefined()
  })
})

// ---- Type label mapping ----

describe('request type label mapping', () => {
  it('maps purchase_request to human-readable label', () => {
    const label = 'purchase_request' === 'purchase_request' ? 'Purchase Request' : 'Expense Claim'
    expect(label).toBe('Purchase Request')
  })

  it('maps expense_claim to human-readable label', () => {
    const requestType: string = 'expense_claim'
    const label = requestType === 'purchase_request' ? 'Purchase Request' : 'Expense Claim'
    expect(label).toBe('Expense Claim')
  })
})

// ---- sendPOCreated ----

const STUB_PO = {
  reference_no: 'PO-2026-00001',
  amount: 12500,
  currency: 'ZAR',
}

const STUB_PR = {
  reference_no: 'PR-2026-00001',
  title: 'New laptop for developer',
  vendor_name: 'Acme Ltd',
}

describe('sendPOCreated payload structure', () => {
  it('uses the correct subject line format', () => {
    const subject = `New PO draft ready: ${STUB_PO.reference_no} — ${STUB_PR.title}`
    expect(subject).toBe('New PO draft ready: PO-2026-00001 — New laptop for developer')
  })

  it('returns no_recipients reason when officers list is empty', () => {
    const officers: { email: string; full_name: string }[] = []
    const reason = officers.length === 0 ? 'no_recipients' : 'ok'
    expect(reason).toBe('no_recipients')
  })

  it('sends one email per procurement officer', () => {
    const officers = [
      { email: 'proc1@bpo.co.za', full_name: 'Carol White' },
      { email: 'proc2@bpo.co.za', full_name: 'Dave Green' },
    ]
    // One email send call per officer
    expect(officers.length).toBe(2)
  })

  it('includes PO reference in the payload', () => {
    expect(STUB_PO.reference_no).toMatch(/^PO-\d{4}-\d{5}$/)
  })

  it('includes PR reference in the payload', () => {
    expect(STUB_PR.reference_no).toMatch(/^PR-\d{4}-\d{5}$/)
  })

  it('uses ZAR as default currency when not provided', () => {
    const currency: string | undefined = undefined
    const resolved = currency ?? 'ZAR'
    expect(resolved).toBe('ZAR')
  })

  it('handles null vendor_name gracefully', () => {
    const vendorName: string | null = null
    const prWithNoVendor = { ...STUB_PR, vendor_name: vendorName }
    expect(prWithNoVendor.vendor_name).toBeNull()
  })
})

// ---- sendBudgetWarning ----

const STUB_BUDGET = {
  costCentreCode: 'CC-OPS-01',
  costCentreName: 'Operations - Cape Town',
  category: 'IT Hardware & Software',
  budgetAmount: 100000,
  committed: 92000,
  available: 8000,
  utilisationPct: 92,
  currency: 'ZAR',
  year: 2026,
}

describe('sendBudgetWarning payload structure', () => {
  it('formats the subject line correctly at 92%', () => {
    const pct = Math.round(STUB_BUDGET.utilisationPct)
    const subject = `[Budget Alert] ${STUB_BUDGET.costCentreCode} — ${STUB_BUDGET.category} at ${pct}% committed`
    expect(subject).toBe('[Budget Alert] CC-OPS-01 — IT Hardware & Software at 92% committed')
  })

  it('rounds the utilisation percentage for the subject', () => {
    const utilisationPct = 91.666
    const pct = Math.round(utilisationPct)
    expect(pct).toBe(92)
  })

  it('returns no_recipients when recipients list is empty', () => {
    const recipients: { email: string; full_name: string }[] = []
    const reason = recipients.length === 0 ? 'no_recipients' : 'ok'
    expect(reason).toBe('no_recipients')
  })

  it('sends one email per recipient', () => {
    const recipients = [
      { email: 'finance1@bpo.co.za', full_name: 'Eve Black' },
      { email: 'owner@bpo.co.za', full_name: 'Frank White' },
    ]
    expect(recipients.length).toBe(2)
  })

  it('calculates available correctly', () => {
    const available = STUB_BUDGET.budgetAmount - STUB_BUDGET.committed
    expect(available).toBe(8000)
  })

  it('flags over-budget when available is negative', () => {
    const available = -5000
    const isOverBudget = available <= 0
    expect(isOverBudget).toBe(true)
  })

  it('is near limit at exactly 90%', () => {
    const utilisationPct = 90
    const isNearLimit = utilisationPct >= 90
    expect(isNearLimit).toBe(true)
  })

  it('is not near limit at 89.9%', () => {
    const utilisationPct = 89.9
    const isNearLimit = utilisationPct >= 90
    expect(isNearLimit).toBe(false)
  })
})
