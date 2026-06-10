import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getRequest, updateDraft, cancelRequest } from '@/lib/data/spend-requests'
import { apiSuccess, apiError } from '@/types/api'

const PRIORITIES = ['normal', 'urgent'] as const

const updateDraftSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  category: z.string().min(1).optional(),
  cost_centre_id: z.string().uuid().optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().min(20).nullable().optional(),
  justification: z.string().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
  project_code: z.string().nullable().optional(),
  required_by: z.string().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
})

type Params = Promise<{ id: string }>

async function getCallerProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  return data
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { id } = await params

  try {
    const request = await getRequest(id)
    if (!request) {
      return NextResponse.json(apiError('Request not found', 'NOT_FOUND'), { status: 404 })
    }
    return NextResponse.json(apiSuccess(request))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch request', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const updated = await updateDraft(id, parsed.data)
    return NextResponse.json(apiSuccess(updated))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to update draft', 'UPDATE_ERROR'),
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { id } = await params

  const existing = await getRequest(id)
  if (!existing) {
    return NextResponse.json(apiError('Request not found', 'NOT_FOUND'), { status: 404 })
  }

  const canCancel =
    existing.requester_id === caller.id &&
    ['draft', 'pending_l1'].includes(existing.status)
  const isAdmin = ['admin', 'group_admin'].includes(caller.role)

  if (!canCancel && !isAdmin) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  try {
    await cancelRequest(id)
    return NextResponse.json(apiSuccess({ cancelled: true }))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to cancel request', 'CANCEL_ERROR'),
      { status: 500 }
    )
  }
}
