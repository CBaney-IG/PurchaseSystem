import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/domain'

// Valid forward transitions in the PO lifecycle
const VALID_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['issued', 'cancelled'],
  issued: ['acknowledged', 'cancelled'],
  acknowledged: ['received', 'cancelled'],
  received: ['invoiced'],
  invoiced: ['closed'],
  closed: [],
  cancelled: [],
}

export function isValidPOTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ---- READ functions (session client — RLS enforced) ----

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, request:spend_requests(id, reference_no, title, type, category, amount), vendor:vendors(id, name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PurchaseOrder[]
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, request:spend_requests(id, reference_no, title, type, category, amount, requester_id, cost_centre_id), vendor:vendors(id, name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as PurchaseOrder
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface CreatePOParams {
  entity_id: string
  request_id: string
  vendor_id: string | null
  vendor_name: string | null
  amount: number
  currency: string
  reference_no: string
}

export async function createPurchaseOrder(params: CreatePOParams): Promise<PurchaseOrder> {
  const service = createServiceClient()

  // Idempotency guard: don't create a second PO for the same request
  const { data: existing } = await service
    .from('purchase_orders')
    .select('id')
    .eq('request_id', params.request_id)
    .maybeSingle()

  if (existing) {
    const { data: po } = await service
      .from('purchase_orders')
      .select('*')
      .eq('id', existing.id)
      .single()
    return po as unknown as PurchaseOrder
  }

  const { data, error } = await service
    .from('purchase_orders')
    .insert({
      entity_id: params.entity_id,
      request_id: params.request_id,
      vendor_id: params.vendor_id,
      vendor_name: params.vendor_name,
      amount: params.amount,
      currency: params.currency,
      reference_no: params.reference_no,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as PurchaseOrder
}

export interface UpdatePOParams {
  status?: PurchaseOrderStatus
  notes?: string | null
  expected_delivery?: string | null
  issued_at?: string | null
}

export async function updatePurchaseOrder(
  id: string,
  params: UpdatePOParams
): Promise<PurchaseOrder> {
  const service = createServiceClient()

  const payload: Record<string, unknown> = {}
  if (params.status !== undefined) payload.status = params.status
  if (params.notes !== undefined) payload.notes = params.notes
  if (params.expected_delivery !== undefined) payload.expected_delivery = params.expected_delivery
  if (params.issued_at !== undefined) payload.issued_at = params.issued_at

  const { data, error } = await service
    .from('purchase_orders')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as PurchaseOrder
}
