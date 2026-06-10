import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- Zod schema mirroring ExpenseForm validation ----

const expenseFormSchema = z
  .object({
    vendor_name: z.string().min(1, 'Vendor / merchant name is required').max(200),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    expense_date: z.string().min(1, 'Expense date is required'),
    category: z.string().min(1, 'Category is required'),
    cost_centre_id: z.string().uuid('Select a cost centre'),
    description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
    project_code: z.string().optional().nullable(),
    justification: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.amount > 5000 && (!data.justification || data.justification.length < 50)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Justification must be at least 50 characters for amounts over R5,000',
        path: ['justification'],
      })
    }
  })

// ---- Title derivation logic ----

function deriveTitle(vendorName: string, category: string): string {
  return `Expense: ${vendorName || category}`
}

// ---- Test data ----

const validBase = {
  vendor_name: 'Woolworths',
  amount: 250,
  expense_date: '2026-06-10',
  category: 'Employee Expense',
  cost_centre_id: '00000000-0000-0000-0000-000000000001',
  description: 'Team lunch for project kickoff meeting.',
}

// ---- Schema tests ----

describe('expense claim schema validation', () => {
  it('accepts a minimal valid expense claim', () => {
    expect(expenseFormSchema.safeParse(validBase).success).toBe(true)
  })

  it('accepts a full valid claim with all optional fields', () => {
    const result = expenseFormSchema.safeParse({
      ...validBase,
      project_code: 'PROJ-042',
      justification: 'This is a business-critical expense requiring additional justification.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing vendor_name', () => {
    const noVendor = { ...validBase, vendor_name: '' }
    const result = expenseFormSchema.safeParse(noVendor)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('vendor_name')
  })

  it('rejects missing expense_date', () => {
    const noDate = { ...validBase, expense_date: '' }
    expect(expenseFormSchema.safeParse(noDate).success).toBe(false)
  })

  it('rejects zero amount', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, amount: 0 }).success).toBe(false)
  })

  it('rejects negative amount', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, amount: -50 }).success).toBe(false)
  })

  it('rejects missing category', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, category: '' }).success).toBe(false)
  })

  it('rejects non-uuid cost_centre_id', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, cost_centre_id: 'bad-id' }).success).toBe(false)
  })

  it('rejects description under 20 characters', () => {
    const result = expenseFormSchema.safeParse({ ...validBase, description: 'Too short' })
    expect(result.success).toBe(false)
  })

  it('requires justification of at least 50 chars when amount exceeds R5,000', () => {
    const result = expenseFormSchema.safeParse({
      ...validBase,
      amount: 6000,
      justification: 'Short reason',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('50 characters')
  })

  it('accepts amount over R5,000 with sufficient justification', () => {
    const result = expenseFormSchema.safeParse({
      ...validBase,
      amount: 7500,
      justification: 'Attended the annual national conference on behalf of the BPO Group operations team.',
    })
    expect(result.success).toBe(true)
  })

  it('does not require justification for amounts at or under R5,000', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, amount: 5000 }).success).toBe(true)
  })

  it('accepts null project_code', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, project_code: null }).success).toBe(true)
  })

  it('accepts null justification for small amounts', () => {
    expect(expenseFormSchema.safeParse({ ...validBase, justification: null }).success).toBe(true)
  })
})

// ---- Title derivation tests ----

describe('expense claim title derivation', () => {
  it('uses vendor name when available', () => {
    expect(deriveTitle('Woolworths', 'Employee Expense')).toBe('Expense: Woolworths')
  })

  it('falls back to category when vendor name is empty', () => {
    expect(deriveTitle('', 'Travel & Accommodation')).toBe('Expense: Travel & Accommodation')
  })

  it('uses vendor name even when category is also set', () => {
    expect(deriveTitle('Uber', 'Travel & Accommodation')).toBe('Expense: Uber')
  })
})

// ---- Receipt validation ----

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

function validateReceipt(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'File type not supported. Use JPG, PNG, or PDF.'
  if (file.size > MAX_SIZE_BYTES) return 'File exceeds 10 MB limit.'
  return null
}

describe('receipt file validation', () => {
  it('accepts a JPEG under 10 MB', () => {
    expect(validateReceipt({ type: 'image/jpeg', size: 1024 * 1024 })).toBeNull()
  })

  it('accepts a PNG', () => {
    expect(validateReceipt({ type: 'image/png', size: 500000 })).toBeNull()
  })

  it('accepts a PDF', () => {
    expect(validateReceipt({ type: 'application/pdf', size: 2 * 1024 * 1024 })).toBeNull()
  })

  it('rejects a DOCX file', () => {
    const err = validateReceipt({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 })
    expect(err).toMatch(/not supported/i)
  })

  it('rejects a file over 10 MB', () => {
    const err = validateReceipt({ type: 'image/jpeg', size: MAX_SIZE_BYTES + 1 })
    expect(err).toMatch(/10 MB/i)
  })

  it('accepts a file exactly at the 10 MB limit', () => {
    expect(validateReceipt({ type: 'image/png', size: MAX_SIZE_BYTES })).toBeNull()
  })
})
