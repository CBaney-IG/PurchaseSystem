import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { AuditReportDocument } from './AuditReportDocument'
import type { RequestForPDF } from '@/lib/data/reports'

const baseRequest: RequestForPDF = {
  reference_no: 'PR-2026-00001',
  type: 'purchase_request',
  title: 'Test Purchase Request',
  description: 'A test purchase for office supplies.',
  justification: 'Needed for daily operations.',
  amount: 5000,
  currency: 'ZAR',
  category: 'Office Supplies',
  priority: 'normal',
  status: 'approved',
  vendor_name: 'SupplyCo',
  project_code: 'P-001',
  required_by: '2026-07-15',
  created_at: '2026-06-10T08:00:00Z',
  submitted_at: '2026-06-10T09:00:00Z',
  approved_at: '2026-06-11T10:00:00Z',
  budget_flag: false,
  requester_name: 'Jane Doe',
  cost_centre_code: 'CC-001',
  cost_centre_name: 'Operations',
  budget_amount: 100000,
  budget_committed: 50000,
  events: [
    {
      id: 'evt-1',
      action: 'submitted',
      actor_name: 'Jane Doe',
      previous_status: null,
      new_status: 'pending_l1',
      comment: null,
      created_at: '2026-06-10T09:00:00Z',
      level: 1,
    },
    {
      id: 'evt-2',
      action: 'approved',
      actor_name: 'Bob Manager',
      previous_status: 'pending_l1',
      new_status: 'approved',
      comment: 'Approved — within budget.',
      created_at: '2026-06-11T10:00:00Z',
      level: 1,
    },
  ],
}

describe('AuditReportDocument', () => {
  it('renders to a non-empty PDF buffer', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = React.createElement(AuditReportDocument, { request: baseRequest, generatedAt: '2026-06-11T12:00:00Z' }) as any
    const buffer = await renderToBuffer(doc)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.byteLength).toBeGreaterThan(0)
    // PDF magic bytes
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })

  it('renders when budget data is absent', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = React.createElement(AuditReportDocument, { request: { ...baseRequest, budget_amount: null, budget_committed: null }, generatedAt: '2026-06-11T12:00:00Z' }) as any
    const buffer = await renderToBuffer(doc)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('renders when events list is empty', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = React.createElement(AuditReportDocument, { request: { ...baseRequest, events: [] }, generatedAt: '2026-06-11T12:00:00Z' }) as any
    const buffer = await renderToBuffer(doc)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('renders expense claim type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = React.createElement(AuditReportDocument, { request: { ...baseRequest, type: 'expense_claim', reference_no: 'EXP-2026-00001' }, generatedAt: '2026-06-11T12:00:00Z' }) as any
    const buffer = await renderToBuffer(doc)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })
})
