import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Profile, UserRole } from '@/types/domain'

// ---- READ functions (session client — RLS enforced) ----

export async function listUsers(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, entity:entities(id, name, code)')
    .order('full_name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}

export async function getUserById(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, entity:entities(id, name, code)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Profile
}

export async function countPendingApprovals(userId: string): Promise<number> {
  const supabase = await createClient()
  const profile = await getUserById(userId)
  if (!profile) return 0

  const roleToStatus: Partial<Record<UserRole, string>> = {
    approver_l1: 'pending_l1',
    approver_l2: 'pending_l2',
    approver_l3: 'pending_l3',
  }
  const pendingStatus = roleToStatus[profile.role]
  if (!pendingStatus) return 0

  const { count } = await supabase
    .from('spend_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', pendingStatus)
    .eq('entity_id', profile.entity_id)

  return count ?? 0
}

// ---- WRITE functions (service client — bypasses RLS) ----

export interface InviteUserParams {
  email: string
  full_name: string
  entity_id: string
  role: UserRole
}

export async function inviteUser(params: InviteUserParams): Promise<{ id: string }> {
  const service = createServiceClient()

  const { data, error } = await service.auth.admin.inviteUserByEmail(params.email, {
    data: { full_name: params.full_name },
  })

  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Invite failed — no user returned')

  // DB trigger created the profile synchronously; update it with correct entity + role
  const { error: profileError } = await service
    .from('profiles')
    .update({
      entity_id: params.entity_id,
      role: params.role,
      full_name: params.full_name,
    })
    .eq('id', data.user.id)

  if (profileError) throw new Error(profileError.message)

  return { id: data.user.id }
}

export interface UpdateUserParams {
  role?: UserRole
  entity_id?: string
  active?: boolean
  department?: string | null
  manager_id?: string | null
  approver_limit?: number
}

export async function updateUser(id: string, params: UpdateUserParams): Promise<void> {
  const service = createServiceClient()
  const { error } = await service.from('profiles').update(params).eq('id', id)
  if (error) throw new Error(error.message)
}
