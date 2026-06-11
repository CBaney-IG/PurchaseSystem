import { createServiceClient } from '@/lib/supabase/service'
import { createPurchaseOrder } from '@/lib/data/purchase-orders'
import { generatePORefNumber } from '@/lib/ref-number'

export interface GeneratePOResult {
  success: boolean
  poId?: string
  poRef?: string
  error?: string
}

// Called fire-and-forget from processApproval when a PR reaches final approval.
// Expense claims do not generate POs.
export async function generatePOFromApprovedRequest(
  requestId: string
): Promise<GeneratePOResult> {
  const service = createServiceClient()

  const { data: request, error: fetchErr } = await service
    .from('spend_requests')
    .select('id, entity_id, type, vendor_id, vendor_name, amount, currency')
    .eq('id', requestId)
    .single()

  if (fetchErr || !request) {
    return { success: false, error: 'Request not found' }
  }

  if (request.type !== 'purchase_request') {
    return { success: false, error: 'Only purchase requests generate POs' }
  }

  try {
    const year = new Date().getFullYear()
    const poRef = await generatePORefNumber(service, year)

    const po = await createPurchaseOrder({
      entity_id: request.entity_id as string,
      request_id: request.id as string,
      vendor_id: (request.vendor_id as string | null) ?? null,
      vendor_name: (request.vendor_name as string | null) ?? null,
      amount: request.amount as number,
      currency: (request.currency as string) ?? 'ZAR',
      reference_no: poRef,
    })

    return { success: true, poId: po.id, poRef: po.reference_no }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'PO creation failed' }
  }
}
