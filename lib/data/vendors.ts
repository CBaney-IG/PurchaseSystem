import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Vendor } from '@/types/domain'

// ---- READ functions (session client — RLS enforced) ----

export async function listVendors(opts: { includeInactive?: boolean } = {}): Promise<Vendor[]> {
  const supabase = await createClient()
  let query = supabase.from('vendors').select('*').order('name')

  if (!opts.includeInactive) {
    query = query.neq('status', 'inactive')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Vendor[]
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface CreateVendorParams {
  entity_id: string
  name: string
  category: string
  contact_name?: string | null
  contact_email?: string | null
  preferred?: boolean
  status?: 'active' | 'inactive' | 'pending'
}

export async function createVendor(params: CreateVendorParams): Promise<Vendor> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('vendors')
    .insert({ preferred: false, status: 'active', ...params })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Vendor
}

export interface UpdateVendorParams {
  name?: string
  category?: string
  contact_name?: string | null
  contact_email?: string | null
  preferred?: boolean
  status?: 'active' | 'inactive' | 'pending'
}

export async function updateVendor(id: string, params: UpdateVendorParams): Promise<Vendor> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('vendors')
    .update(params)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Vendor
}

export async function importVendors(
  entityId: string,
  rows: Omit<CreateVendorParams, 'entity_id'>[]
): Promise<{ inserted: number }> {
  if (rows.length === 0) return { inserted: 0 }

  const service = createServiceClient()
  const records = rows.map((r) => ({ ...r, entity_id: entityId, status: r.status ?? 'active', preferred: r.preferred ?? false }))

  const { error } = await service
    .from('vendors')
    .insert(records)

  if (error) throw new Error(error.message)
  return { inserted: rows.length }
}
