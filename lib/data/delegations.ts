import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Delegation } from '@/types/domain'

export type DelegationWithProfiles = Delegation & {
  delegator: { id: string; full_name: string; email: string }
  delegate: { id: string; full_name: string; email: string }
}

// ---- READ functions (session client — RLS enforced) ----

export async function listMyDelegations(): Promise<DelegationWithProfiles[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('delegations')
    .select(`
      *,
      delegator:profiles!delegator_id(id, full_name, email),
      delegate:profiles!delegate_id(id, full_name, email)
    `)
    .or(`delegator_id.eq.${user.id},delegate_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DelegationWithProfiles[]
}

export async function getMyActiveDelegation(): Promise<DelegationWithProfiles | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('delegations')
    .select(`
      *,
      delegator:profiles!delegator_id(id, full_name, email),
      delegate:profiles!delegate_id(id, full_name, email)
    `)
    .eq('delegator_id', user.id)
    .eq('active', true)
    .lte('valid_from', now)
    .gte('valid_until', now)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as unknown as DelegationWithProfiles | null
}

// ---- Service-layer helpers (used by processApproval) ----

/**
 * Given an approver ID, return the effective approver — either the delegate
 * (if an active delegation exists right now) or the original approver.
 */
export async function resolveEffectiveApprover(
  approverId: string
): Promise<{ effectiveId: string; isDelegated: boolean; delegatorId?: string }> {
  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data } = await service
    .from('delegations')
    .select('id, delegate_id')
    .eq('delegator_id', approverId)
    .eq('active', true)
    .lte('valid_from', now)
    .gte('valid_until', now)
    .maybeSingle()

  if (data) {
    return { effectiveId: data.delegate_id as string, isDelegated: true, delegatorId: approverId }
  }
  return { effectiveId: approverId, isDelegated: false }
}

/**
 * Given an actor ID (someone who just approved/rejected), check if they are
 * currently acting as a delegate for someone else. Used to annotate approval_events.
 */
export async function getDelegationContextForActor(
  actorId: string
): Promise<{ isDelegating: boolean; delegatorId?: string } > {
  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data } = await service
    .from('delegations')
    .select('id, delegator_id')
    .eq('delegate_id', actorId)
    .eq('active', true)
    .lte('valid_from', now)
    .gte('valid_until', now)
    .maybeSingle()

  if (data) {
    return { isDelegating: true, delegatorId: data.delegator_id as string }
  }
  return { isDelegating: false }
}

// ---- WRITE functions (service client) ----

export interface CreateDelegationParams {
  delegatorId: string
  delegateId: string
  validFrom: string  // ISO timestamp
  validUntil: string // ISO timestamp
  reason?: string | null
}

export async function createDelegation(
  params: CreateDelegationParams
): Promise<{ id: string }> {
  const service = createServiceClient()
  const { delegatorId, delegateId, validFrom, validUntil, reason } = params

  if (delegatorId === delegateId) {
    throw new Error('You cannot delegate to yourself')
  }

  const from = new Date(validFrom)
  const until = new Date(validUntil)
  if (until <= from) {
    throw new Error('valid_until must be after valid_from')
  }

  // Check for overlapping active delegations for this delegator
  const { data: overlap } = await service
    .from('delegations')
    .select('id')
    .eq('delegator_id', delegatorId)
    .eq('active', true)
    .lt('valid_from', validUntil)
    .gt('valid_until', validFrom)
    .maybeSingle()

  if (overlap) {
    throw new Error('You already have an active delegation that overlaps with these dates')
  }

  const { data, error } = await service
    .from('delegations')
    .insert({
      delegator_id: delegatorId,
      delegate_id: delegateId,
      valid_from: validFrom,
      valid_until: validUntil,
      reason: reason ?? null,
      active: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return { id: data.id as string }
}

export async function cancelDelegation(
  delegationId: string,
  requestingUserId: string
): Promise<void> {
  const service = createServiceClient()

  // Verify ownership
  const { data, error: fetchErr } = await service
    .from('delegations')
    .select('delegator_id')
    .eq('id', delegationId)
    .single()

  if (fetchErr || !data) throw new Error('Delegation not found')
  if (data.delegator_id !== requestingUserId) {
    throw new Error('You can only cancel your own delegations')
  }

  const { error } = await service
    .from('delegations')
    .update({ active: false })
    .eq('id', delegationId)

  if (error) throw new Error(error.message)
}
