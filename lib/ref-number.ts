import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpendRequestType } from '@/types/domain'

const PREFIX: Record<SpendRequestType, string> = {
  purchase_request: 'PR',
  expense_claim: 'EXP',
}

export async function generateRefNumber(
  type: SpendRequestType,
  service: SupabaseClient,
  year: number
): Promise<string> {
  const prefix = PREFIX[type]

  const { count, error } = await service
    .from('spend_requests')
    .select('*', { count: 'exact', head: true })
    .like('reference_no', `${prefix}-${year}-%`)

  if (error) throw new Error(error.message)

  const seq = ((count ?? 0) + 1).toString().padStart(5, '0')
  return `${prefix}-${year}-${seq}`
}

// PO-YYYY-NNNNN — queries purchase_orders table for its own sequence
export async function generatePORefNumber(
  service: SupabaseClient,
  year: number
): Promise<string> {
  const { count, error } = await service
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .like('reference_no', `PO-${year}-%`)

  if (error) throw new Error(error.message)

  const seq = ((count ?? 0) + 1).toString().padStart(5, '0')
  return `PO-${year}-${seq}`
}
