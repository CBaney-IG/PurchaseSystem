import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listUsers, inviteUser, updateUser, countPendingApprovals } from '@/lib/data/users'
import { apiSuccess, apiError } from '@/types/api'

const USER_ROLES = [
  'requester',
  'approver_l1',
  'approver_l2',
  'approver_l3',
  'procurement_officer',
  'finance',
  'admin',
  'group_admin',
] as const

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Name is required'),
  entity_id: z.string().uuid('Invalid entity ID'),
  role: z.enum(USER_ROLES),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(USER_ROLES).optional(),
  entity_id: z.string().uuid().optional(),
  active: z.boolean().optional(),
  department: z.string().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  approver_limit: z.number().nonnegative().optional(),
})

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  return data
}

export async function GET() {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['admin', 'group_admin'].includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  try {
    const users = await listUsers()
    return NextResponse.json(apiSuccess(users))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch users', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['admin', 'group_admin'].includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  const body = await request.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  // admin can only invite users into their own entity
  if (caller.role === 'admin' && parsed.data.entity_id !== caller.entity_id) {
    return NextResponse.json(
      apiError('Admins can only invite users to their own entity', 'FORBIDDEN'),
      { status: 403 }
    )
  }

  try {
    const result = await inviteUser(parsed.data)
    return NextResponse.json(apiSuccess(result), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invite failed'
    const code = message.includes('already registered') ? 'USER_EXISTS' : 'INVITE_ERROR'
    return NextResponse.json(apiError(message, code), { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['admin', 'group_admin'].includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const { id, ...params } = parsed.data

  // If deactivating, warn about pending approvals (client already fetched count — this is a double-check)
  if (params.active === false) {
    const pending = await countPendingApprovals(id)
    if (pending > 0) {
      return NextResponse.json(
        apiError(
          `This user has ${pending} pending approval(s). Reassign them before deactivating.`,
          'PENDING_APPROVALS'
        ),
        { status: 409 }
      )
    }
  }

  try {
    await updateUser(id, params)
    return NextResponse.json(apiSuccess({ updated: true }))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Update failed', 'UPDATE_ERROR'),
      { status: 500 }
    )
  }
}
