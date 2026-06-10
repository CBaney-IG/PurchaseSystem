import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listCostCentres, createCostCentre, updateCostCentre } from '@/lib/data/cost-centres'
import { apiSuccess, apiError } from '@/types/api'

const createSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Code must be 20 characters or fewer'),
  name: z.string().min(1, 'Name is required'),
  budget_owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  entity_id: z.string().uuid().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).optional(),
  budget_owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
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

export async function GET(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const centres = await listCostCentres({ includeInactive })
    return NextResponse.json(apiSuccess(centres))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch cost centres', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['finance', 'admin', 'group_admin'].includes(caller.role)) {
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

  // admin can only create cost centres in their own entity
  const entity_id =
    caller.role === 'group_admin' && parsed.data.entity_id
      ? parsed.data.entity_id
      : caller.entity_id

  try {
    const centre = await createCostCentre({
      code: parsed.data.code,
      name: parsed.data.name,
      budget_owner_id: parsed.data.budget_owner_id,
      parent_id: parsed.data.parent_id,
      entity_id,
    })
    return NextResponse.json(apiSuccess(centre), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    const code = message.includes('unique') ? 'DUPLICATE_CODE' : 'CREATE_ERROR'
    return NextResponse.json(apiError(message, code), { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['finance', 'admin', 'group_admin'].includes(caller.role)) {
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
    const centre = await updateCostCentre(id, params)
    return NextResponse.json(apiSuccess(centre))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    const code = message.includes('unique') ? 'DUPLICATE_CODE' : 'UPDATE_ERROR'
    return NextResponse.json(apiError(message, code), { status: 400 })
  }
}
