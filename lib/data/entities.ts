import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Entity } from '@/types/domain'

// ---- READ functions (session client — RLS enforced) ----

export async function listEntities(): Promise<Entity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entities')
    .select('*, parent:entities!parent_id(id, name, code)')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Entity[]
}

export async function getEntityById(id: string): Promise<Entity | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entities')
    .select('*, parent:entities!parent_id(id, name, code)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Entity
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface CreateEntityParams {
  name: string
  code: string
  parent_id?: string | null
}

export async function createEntity(params: CreateEntityParams): Promise<Entity> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('entities')
    .insert({ ...params, active: true })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Entity
}

export interface UpdateEntityParams {
  name?: string
  code?: string
  parent_id?: string | null
  active?: boolean
}

export async function updateEntity(id: string, params: UpdateEntityParams): Promise<Entity> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('entities')
    .update(params)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Entity
}
