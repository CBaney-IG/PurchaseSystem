import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/types/api'

// Maps an approver role to the pending status it is responsible for.
// admin / group_admin / procurement_officer see all pending levels.
const ROLE_STATUS: Partial<Record<string, string[]>> = {
  approver_l1: ['pending_l1'],
  approver_l2: ['pending_l2'],
  approver_l3: ['pending_l3'],
}

const ADMIN_ROLES = ['admin', 'group_admin', 'procurement_officer', 'finance']

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json(apiError('Profile not found', 'NOT_FOUND'), { status: 404 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'))
  const offset = (page - 1) * limit

  // Determine which pending statuses this caller can act on
  const isAdmin = ADMIN_ROLES.includes(profile.role)
  const pendingStatuses: string[] = isAdmin
    ? ['pending_l1', 'pending_l2', 'pending_l3']
    : ROLE_STATUS[profile.role] ?? []

  if (pendingStatuses.length === 0) {
    // Requester or other role with no inbox
    return NextResponse.json(apiSuccess({ pending: [], count: 0 }))
  }

  // RLS will scope to the correct entity automatically (session client).
  // group_admin can see across all entities — RLS on the session client handles this.
  let query = supabase
    .from('spend_requests')
    .select(
      '*, cost_centre:cost_centres!cost_centre_id(id, code, name), requester:profiles!requester_id(id, full_name, email)',
      { count: 'exact' }
    )
    .in('status', pendingStatuses)
    .is('deleted_at', null)
    .order('priority', { ascending: false }) // urgent first
    .order('submitted_at', { ascending: true }) // oldest first within priority
    .range(offset, offset + limit - 1)

  // Apply optional filters from query params
  const category = url.searchParams.get('category')
  if (category) query = query.eq('category', category)

  const amountMin = url.searchParams.get('amount_min')
  if (amountMin) query = query.gte('amount', parseFloat(amountMin))

  const amountMax = url.searchParams.get('amount_max')
  if (amountMax) query = query.lte('amount', parseFloat(amountMax))

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(apiError(error.message, 'QUERY_ERROR'), { status: 500 })
  }

  return NextResponse.json(apiSuccess({ pending: data ?? [], count: count ?? 0 }))
}
