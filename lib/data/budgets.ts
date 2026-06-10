import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Budget, CostCentre } from '@/types/domain'

export type BudgetWithCostCentre = Omit<Budget, 'cost_centre'> & {
  cost_centre: Pick<CostCentre, 'id' | 'code' | 'name'> | null
}

// ---- READ functions (session client — RLS enforced) ----

export async function listBudgets(opts: {
  year?: number
  costCentreId?: string
} = {}): Promise<BudgetWithCostCentre[]> {
  const supabase = await createClient()
  const year = opts.year ?? new Date().getFullYear()

  let query = supabase
    .from('budgets')
    .select('*, cost_centre:cost_centres!cost_centre_id(id, code, name)')
    .eq('period_year', year)
    .is('period_month', null) // annual budgets only in admin view
    .order('category')

  if (opts.costCentreId) {
    query = query.eq('cost_centre_id', opts.costCentreId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as BudgetWithCostCentre[]
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface UpsertBudgetParams {
  cost_centre_id: string
  category: string
  period_year: number
  period_month?: number | null
  amount: number
  currency?: string
  reason?: string // required for mid-year adjustment; stored in adjustment log
}

export async function upsertBudget(params: UpsertBudgetParams): Promise<Budget> {
  const service = createServiceClient()
  const budgetFields = {
    cost_centre_id: params.cost_centre_id,
    category: params.category,
    period_year: params.period_year,
    period_month: params.period_month ?? null,
    amount: params.amount,
    currency: params.currency ?? 'ZAR',
  }

  const { data, error } = await service
    .from('budgets')
    .upsert(
      budgetFields,
      { onConflict: 'cost_centre_id,category,period_year,period_month' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Budget
}

export interface ImportBudgetRow {
  cost_centre_code: string
  category: string
  period_year: number
  amount: number
  currency?: string
}

export async function importBudgets(
  entityId: string,
  rows: ImportBudgetRow[]
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] }

  // Resolve cost centre codes to IDs for this entity
  const service = createServiceClient()
  const codes = [...new Set(rows.map((r) => r.cost_centre_code))]
  const { data: centres, error: ccErr } = await service
    .from('cost_centres')
    .select('id, code')
    .eq('entity_id', entityId)
    .in('code', codes)

  if (ccErr) throw new Error(ccErr.message)

  const codeToId = Object.fromEntries((centres ?? []).map((c) => [c.code, c.id]))
  const errors: string[] = []
  const records = []

  for (const row of rows) {
    const ccId = codeToId[row.cost_centre_code]
    if (!ccId) {
      errors.push(`Cost centre code '${row.cost_centre_code}' not found in this entity`)
      continue
    }
    records.push({
      cost_centre_id: ccId,
      category: row.category,
      period_year: row.period_year,
      period_month: null,
      amount: row.amount,
      currency: row.currency ?? 'ZAR',
    })
  }

  if (records.length === 0) return { inserted: 0, errors }

  const { error } = await service
    .from('budgets')
    .upsert(records, { onConflict: 'cost_centre_id,category,period_year,period_month' })

  if (error) throw new Error(error.message)
  return { inserted: records.length, errors }
}
