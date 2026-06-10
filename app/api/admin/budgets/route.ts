import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listBudgets, upsertBudget, importBudgets } from '@/lib/data/budgets'
import { apiSuccess, apiError } from '@/types/api'

const upsertSchema = z.object({
  cost_centre_id: z.string().uuid('Invalid cost centre'),
  category: z.string().min(1, 'Category is required'),
  period_year: z.number().int().min(2020).max(2040),
  period_month: z.number().int().min(1).max(12).nullable().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional(),
  reason: z.string().optional(),
})

const importRowSchema = z.object({
  cost_centre_code: z.string().min(1),
  category: z.string().min(1),
  period_year: z.number().int().min(2020).max(2040),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
})

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1),
})

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  return data
}

export async function GET(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const costCentreId = searchParams.get('cost_centre_id') ?? undefined

  try {
    const budgets = await listBudgets({ year, costCentreId })
    return NextResponse.json(apiSuccess(budgets))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch budgets', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['finance', 'admin', 'group_admin'].includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  const body = await request.json()

  // Bulk import
  if (body.rows !== undefined) {
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }
    try {
      const result = await importBudgets(caller.entity_id, parsed.data.rows)
      return NextResponse.json(apiSuccess(result), { status: 201 })
    } catch (err) {
      return NextResponse.json(
        apiError(err instanceof Error ? err.message : 'Import failed', 'IMPORT_ERROR'),
        { status: 500 }
      )
    }
  }

  // Single upsert
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const budget = await upsertBudget(parsed.data)
    return NextResponse.json(apiSuccess(budget), { status: 201 })
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Save failed', 'UPSERT_ERROR'),
      { status: 500 }
    )
  }
}
