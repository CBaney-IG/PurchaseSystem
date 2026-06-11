import { describe, it, expect } from 'vitest'

// Mirror the validation logic from ApprovalActionDialog — comment requirements per action type
function validateComment(
  action: 'approve' | 'reject' | 'request_info',
  comment: string
): string | null {
  if (action === 'reject') {
    if (comment.trim().length < 10) {
      return 'Rejection reason must be at least 10 characters.'
    }
  }
  if (action === 'request_info') {
    if (comment.trim().length === 0) {
      return 'This field is required.'
    }
  }
  return null
}

describe('approve action validation', () => {
  it('accepts empty comment', () => {
    expect(validateComment('approve', '')).toBeNull()
  })

  it('accepts a non-empty comment', () => {
    expect(validateComment('approve', 'Looks good to me.')).toBeNull()
  })

  it('accepts whitespace-only comment (optional field)', () => {
    expect(validateComment('approve', '   ')).toBeNull()
  })
})

describe('reject action validation', () => {
  it('accepts a comment of 10 or more characters', () => {
    expect(validateComment('reject', 'Not within policy limits.')).toBeNull()
  })

  it('rejects an empty comment', () => {
    expect(validateComment('reject', '')).not.toBeNull()
  })

  it('rejects a comment of exactly 9 characters', () => {
    expect(validateComment('reject', '123456789')).not.toBeNull()
  })

  it('accepts a comment of exactly 10 characters', () => {
    expect(validateComment('reject', '1234567890')).toBeNull()
  })

  it('error message mentions 10 characters', () => {
    const msg = validateComment('reject', 'short')
    expect(msg).toContain('10 characters')
  })

  it('trims whitespace before checking length', () => {
    // 9 non-space chars surrounded by spaces = 11 total chars but only 9 non-whitespace
    expect(validateComment('reject', '  123456789  ')).not.toBeNull()
  })
})

describe('request_info action validation', () => {
  it('accepts a non-empty question', () => {
    expect(validateComment('request_info', 'Can you provide the supplier quote?')).toBeNull()
  })

  it('rejects an empty comment', () => {
    expect(validateComment('request_info', '')).not.toBeNull()
  })

  it('rejects a whitespace-only comment', () => {
    expect(validateComment('request_info', '   ')).not.toBeNull()
  })
})

// ---- Bulk approve dialog ----

describe('BulkApproveDialog display logic', () => {
  it('shows singular "request" for count of 1', () => {
    const count = 1
    const label = `Approve ${count} request${count === 1 ? '' : 's'}`
    expect(label).toBe('Approve 1 request')
  })

  it('shows plural "requests" for count > 1', () => {
    const count: number = 5
    const label = `Approve ${count} request${count === 1 ? '' : 's'}`
    expect(label).toBe('Approve 5 requests')
  })

  it('formats total amount as currency', () => {
    const amount = 15250
    const formatted = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount)
    expect(formatted).toMatch(/15.250/)
  })
})
