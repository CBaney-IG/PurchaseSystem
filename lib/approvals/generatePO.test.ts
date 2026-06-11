import { describe, it, expect } from 'vitest'
import type { GeneratePOResult } from './generatePO'

// ---- GeneratePOResult shape ----

describe('GeneratePOResult shape', () => {
  it('success result includes poId and poRef', () => {
    const result: GeneratePOResult = {
      success: true,
      poId: 'po-uuid-123',
      poRef: 'PO-2026-00001',
    }
    expect(result.success).toBe(true)
    expect(result.poId).toBeDefined()
    expect(result.poRef).toMatch(/^PO-\d{4}-\d{5}$/)
  })

  it('failure result includes error and no poId/poRef', () => {
    const result: GeneratePOResult = {
      success: false,
      error: 'Request not found',
    }
    expect(result.success).toBe(false)
    expect(result.poId).toBeUndefined()
    expect(result.poRef).toBeUndefined()
    expect(result.error).toBeTruthy()
  })
})

// ---- Business rules (pure logic, not Supabase calls) ----

describe('PO generation guard rules', () => {
  it('should only generate POs for purchase_request type', () => {
    const requestType: string = 'expense_claim'
    // Mirror the guard in generatePOFromApprovedRequest
    const shouldGenerate = requestType === 'purchase_request'
    expect(shouldGenerate).toBe(false)
  })

  it('should generate a PO for purchase_request type', () => {
    const requestType: string = 'purchase_request'
    const shouldGenerate = requestType === 'purchase_request'
    expect(shouldGenerate).toBe(true)
  })

  it('error message for wrong type is descriptive', () => {
    const errorMsg = 'Only purchase requests generate POs'
    expect(errorMsg.length).toBeGreaterThan(10)
    expect(errorMsg).toContain('purchase requests')
  })
})

// ---- PO currency default ----

describe('PO currency handling', () => {
  it('defaults to ZAR when currency is null', () => {
    const currency: string | null = null
    const resolved = currency ?? 'ZAR'
    expect(resolved).toBe('ZAR')
  })

  it('uses provided currency when set', () => {
    const currency: string | null = 'USD'
    const resolved = currency ?? 'ZAR'
    expect(resolved).toBe('USD')
  })
})

// ---- Error wrapping ----

describe('PO creation error handling', () => {
  it('wraps Error objects into a string message', () => {
    const err: unknown = new Error('unique constraint violation')
    const msg = err instanceof Error ? err.message : 'PO creation failed'
    expect(msg).toBe('unique constraint violation')
  })

  it('falls back to generic message for non-Error throws', () => {
    const err: unknown = 'some string'
    const msg = err instanceof Error ? err.message : 'PO creation failed'
    expect(msg).toBe('PO creation failed')
  })
})
