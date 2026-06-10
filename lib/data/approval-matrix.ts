import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRequiredLevels } from '@/lib/approvals/matrix'
import type { ApprovalMatrix, UserRole } from '@/types/domain'

// ---- READ functions (session client — RLS enforced) ----

export async function listMatrix(opts: { entityId?: string } = {}): Promise<ApprovalMatrix[]> {
  const supabase = await createClient()
  let query = supabase
    .from('approval_matrices')
    .select('*')
    .order('category')
    .order('level')

  if (opts.entityId) {
    query = query.eq('entity_id', opts.entityId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ApprovalMatrix[]
}

export async function listDistinctCategories(entityId?: string): Promise<string[]> {
  const supabase = await createClient()
  let query = supabase
    .from('approval_matrices')
    .select('category')
    .order('category')

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  for (const row of data ?? []) seen.add(row.category)
  return [...seen]
}

export interface SimulateResult {
  level: number
  approver_role: string
  min_amount: number
  max_amount: number | null
  escalate_hours: number
}

export async function simulateApprovalPath(
  entityId: string,
  category: string,
  amount: number
): Promise<SimulateResult[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('approval_matrices')
    .select('*')
    .eq('entity_id', entityId)
    .eq('category', category)
    .eq('active', true)
    .order('level')

  if (error) throw new Error(error.message)
  return getRequiredLevels(data ?? [], amount) as SimulateResult[]
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface UpdateMatrixCellParams {
  min_amount?: number
  max_amount?: number | null
  approver_role?: UserRole
  require_all?: boolean
  escalate_hours?: number
  active?: boolean
}

export async function updateMatrixCell(
  id: string,
  params: UpdateMatrixCellParams
): Promise<ApprovalMatrix> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('approval_matrices')
    .update(params)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ApprovalMatrix
}

export interface CreateMatrixCellParams {
  entity_id: string
  category: string
  level: number
  min_amount: number
  max_amount: number | null
  approver_role: UserRole
  require_all?: boolean
  escalate_hours?: number
}

export async function createMatrixCell(params: CreateMatrixCellParams): Promise<ApprovalMatrix> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('approval_matrices')
    .insert({ require_all: false, escalate_hours: 48, active: true, ...params })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ApprovalMatrix
}
