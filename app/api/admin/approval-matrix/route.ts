import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listMatrix, updateMatrixCell, createMatrixCell } from '@/lib/data/approval-matrix'
import { apiSuccess, apiError } from '@/types/api'

const USER_ROLES = [
  'requester', 'approver_l1', 'approver_l2', 'approver_l3',
  'procurement_officer', 'finance', 'admin', 'group_admin',
] as const

const createSchema = z.object({
  category: z.string().min(1),
  level: z.number().int().min(1).max(6),
  min_amount: z.number().min(0),
  max_amount: z.number().positive().nullable(),
  approver_role: z.enum(USER_ROLES),
  require_all: z.boolean().optional(),
  escalate_hours: z.number().int().min(1).optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().positive().nullable().optional(),
  approver_role: z.enum(USER_ROLES).optional(),
  require_all: z.boolean().optional(),
  escalate_hours: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
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

  try {
    const matrix = await listMatrix()
    return NextResponse.json(apiSuccess(matrix))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch matrix', 'FETCH_ERROR'),
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
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const cell = await createMatrixCell({ ...parsed.data, entity_id: caller.entity_id })
    return NextResponse.json(apiSuccess(cell), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    const code = message.includes('unique') ? 'DUPLICATE_CELL' : 'CREATE_ERROR'
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

  try {
    const cell = await updateMatrixCell(id, params)
    return NextResponse.json(apiSuccess(cell))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Update failed', 'UPDATE_ERROR'),
      { status: 500 }
    )
  }
}
