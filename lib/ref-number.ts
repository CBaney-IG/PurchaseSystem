import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpendRequestType } from '@/types/domain'

const PREFIX: Record<SpendRequestType, string> = {
  purchase_request: 'PR',
  expense_claim: 'EXP',
}

/**
 * Generates the next sequential reference number for a spend request.
 * Format: PR-YYYY-NNNNN or EXP-YYYY-NNNNN (5-digit zero-padded).
 * Seeds the sequence from the count of existing refs matching the prefix+year pattern.
 * The UNIQUE constraint on reference_no handles the rare concurrent-insert race.
 */
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
