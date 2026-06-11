'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPurchaseOrder, updatePurchaseOrder, isValidPOTransition } from '@/lib/data/purchase-orders'
import type { PurchaseOrderStatus } from '@/types/domain'

const EDIT_ROLES = ['procurement_officer', 'admin', 'group_admin']

const UpdatePOSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'issued', 'acknowledged', 'received', 'invoiced', 'closed', 'cancelled']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  expected_delivery: z.string().nullable().optional(),
})

export interface UpdatePOState {
  error?: string
  success?: boolean
}

export async function updatePOAction(
  _prev: UpdatePOState,
  formData: FormData
): Promise<UpdatePOState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !EDIT_ROLES.includes(profile.role)) {
    return { error: 'You do not have permission to update purchase orders.' }
  }

  const raw = {
    id: formData.get('id') as string,
    status: (formData.get('status') as string) || undefined,
    notes: formData.get('notes') as string | null,
    expected_delivery: (formData.get('expected_delivery') as string) || null,
  }

  const parsed = UpdatePOSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const { id, status, notes, expected_delivery } = parsed.data

  // Fetch the PO to validate the transition
  const po = await getPurchaseOrder(id)
  if (!po) return { error: 'Purchase order not found.' }

  if (status && status !== po.status) {
    if (!isValidPOTransition(po.status, status as PurchaseOrderStatus)) {
      return { error: `Cannot transition from "${po.status}" to "${status}".` }
    }
  }

  const updateParams: Parameters<typeof updatePurchaseOrder>[1] = {}
  if (status && status !== po.status) updateParams.status = status as PurchaseOrderStatus
  if (notes !== undefined) updateParams.notes = notes
  if (expected_delivery !== undefined) updateParams.expected_delivery = expected_delivery
  // Auto-set issued_at when moving to 'issued'
  if (status === 'issued' && po.status !== 'issued') {
    updateParams.issued_at = new Date().toISOString()
  }

  try {
    await updatePurchaseOrder(id, updateParams)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update purchase order.' }
  }

  revalidatePath(`/purchase-orders/${id}`)
  revalidatePath('/purchase-orders')
  return { success: true }
}
