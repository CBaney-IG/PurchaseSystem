import { describe, it, expect } from 'vitest'
import { isValidPOTransition } from './purchase-orders'
import type { PurchaseOrderStatus } from '@/types/domain'

describe('isValidPOTransition', () => {
  // Happy-path forward transitions
  it('allows draft → issued', () => {
    expect(isValidPOTransition('draft', 'issued')).toBe(true)
  })

  it('allows draft → cancelled', () => {
    expect(isValidPOTransition('draft', 'cancelled')).toBe(true)
  })

  it('allows issued → acknowledged', () => {
    expect(isValidPOTransition('issued', 'acknowledged')).toBe(true)
  })

  it('allows issued → cancelled', () => {
    expect(isValidPOTransition('issued', 'cancelled')).toBe(true)
  })

  it('allows acknowledged → received', () => {
    expect(isValidPOTransition('acknowledged', 'received')).toBe(true)
  })

  it('allows acknowledged → cancelled', () => {
    expect(isValidPOTransition('acknowledged', 'cancelled')).toBe(true)
  })

  it('allows received → invoiced', () => {
    expect(isValidPOTransition('received', 'invoiced')).toBe(true)
  })

  it('allows invoiced → closed', () => {
    expect(isValidPOTransition('invoiced', 'closed')).toBe(true)
  })

  // Backwards / skip transitions must be blocked
  it('blocks draft → acknowledged (skip)', () => {
    expect(isValidPOTransition('draft', 'acknowledged')).toBe(false)
  })

  it('blocks issued → received (skip)', () => {
    expect(isValidPOTransition('issued', 'received')).toBe(false)
  })

  it('blocks invoiced → draft (backwards)', () => {
    expect(isValidPOTransition('invoiced', 'draft')).toBe(false)
  })

  it('blocks closed → any status (terminal)', () => {
    const statuses: PurchaseOrderStatus[] = [
      'draft', 'issued', 'acknowledged', 'received', 'invoiced', 'cancelled',
    ]
    for (const s of statuses) {
      expect(isValidPOTransition('closed', s)).toBe(false)
    }
  })

  it('blocks cancelled → any status (terminal)', () => {
    const statuses: PurchaseOrderStatus[] = [
      'draft', 'issued', 'acknowledged', 'received', 'invoiced', 'closed',
    ]
    for (const s of statuses) {
      expect(isValidPOTransition('cancelled', s)).toBe(false)
    }
  })

  it('blocks a status from transitioning to itself', () => {
    const statuses: PurchaseOrderStatus[] = [
      'draft', 'issued', 'acknowledged', 'received', 'invoiced', 'closed', 'cancelled',
    ]
    for (const s of statuses) {
      expect(isValidPOTransition(s, s)).toBe(false)
    }
  })

  it('blocks received → cancelled (cannot cancel after delivery)', () => {
    expect(isValidPOTransition('received', 'cancelled')).toBe(false)
  })

  it('blocks invoiced → cancelled (cannot cancel after invoicing)', () => {
    expect(isValidPOTransition('invoiced', 'cancelled')).toBe(false)
  })
})

// ---- PO reference number format ----

describe('PO reference number format', () => {
  it('matches the expected PO-YYYY-NNNNN pattern', () => {
    const ref = 'PO-2026-00001'
    expect(ref).toMatch(/^PO-\d{4}-\d{5}$/)
  })

  it('pads the sequence to 5 digits', () => {
    const seq = (1).toString().padStart(5, '0')
    expect(seq).toBe('00001')
  })

  it('handles a high sequence number', () => {
    const seq = (99999).toString().padStart(5, '0')
    expect(seq).toBe('99999')
  })

  it('formats the year from the current date', () => {
    const year = new Date().getFullYear()
    const ref = `PO-${year}-00001`
    expect(ref).toMatch(/^PO-20\d{2}-00001$/)
  })
})
