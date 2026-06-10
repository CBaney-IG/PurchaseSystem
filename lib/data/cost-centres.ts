import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { CostCentre } from '@/types/domain'

export interface CostCentreWithOwner extends CostCentre {
  budget_owner?: { id: string; full_name: string } | null
  parent?: Pick<CostCentre, 'id' | 'code' | 'name'> | null
}

// ---- READ functions (session client — RLS enforced) ----

export async function listCostCentres(
  opts: { includeInactive?: boolean } = {}
): Promise<CostCentreWithOwner[]> {
  const supabase = await createClient()
  let query = supabase
    .from('cost_centres')
    .select('*, budget_owner:profiles!budget_owner_id(id, full_name), parent:cost_centres!parent_id(id, code, name)')
    .order('code')

  if (!opts.includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as CostCentreWithOwner[]
}

export async function getCostCentreById(id: string): Promise<CostCentreWithOwner | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cost_centres')
    .select('*, budget_owner:profiles!budget_owner_id(id, full_name), parent:cost_centres!parent_id(id, code, name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as CostCentreWithOwner
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface CreateCostCentreParams {
  entity_id: string
  code: string
  name: string
  budget_owner_id?: string | null
  parent_id?: string | null
}

export async function createCostCentre(params: CreateCostCentreParams): Promise<CostCentreWithOwner> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('cost_centres')
    .insert({ active: true, ...params })
    .select('*, budget_owner:profiles!budget_owner_id(id, full_name), parent:cost_centres!parent_id(id, code, name)')
    .single()

  if (error) throw new Error(error.message)
  return data as CostCentreWithOwner
}

export interface UpdateCostCentreParams {
  code?: string
  name?: string
  budget_owner_id?: string | null
  parent_id?: string | null
  active?: boolean
}

export async function updateCostCentre(
  id: string,
  params: UpdateCostCentreParams
): Promise<CostCentreWithOwner> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('cost_centres')
    .update(params)
    .eq('id', id)
    .select('*, budget_owner:profiles!budget_owner_id(id, full_name), parent:cost_centres!parent_id(id, code, name)')
    .single()

  if (error) throw new Error(error.message)
  return data as CostCentreWithOwner
}
