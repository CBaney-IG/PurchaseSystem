import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { processApproval } from '@/lib/approvals/processApproval'
import { apiSuccess, apiError } from '@/types/api'

type Params = Promise<{ id: string }>

const bodySchema = z.object({
  comment: z.string().min(1, 'A question is required').max(2000),
})

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

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { id: requestId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(apiError('Request body required', 'BAD_REQUEST'), { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const approverRoles = ['approver_l1', 'approver_l2', 'approver_l3', 'admin', 'group_admin', 'procurement_officer']
  if (!approverRoles.includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden — approver role required', 'FORBIDDEN'), { status: 403 })
  }

  const service = createServiceClient()
  const { data: req } = await service
    .from('spend_requests')
    .select('entity_id, current_level, status')
    .eq('id', requestId)
    .is('deleted_at', null)
    .single()

  if (!req) {
    return NextResponse.json(apiError('Request not found', 'NOT_FOUND'), { status: 404 })
  }

  if (caller.role !== 'group_admin' && caller.entity_id !== req.entity_id) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  if (!String(req.status).startsWith('pending_l')) {
    return NextResponse.json(
      apiError(`Cannot request information on a request with status "${req.status}"`, 'INVALID_STATUS'),
      { status: 400 }
    )
  }

  if (caller.role !== 'admin' && caller.role !== 'group_admin' && caller.role !== 'procurement_officer') {
    const expectedRole = `approver_l${req.current_level}`
    if (caller.role !== expectedRole) {
      return NextResponse.json(
        apiError('Not authorized to request information at this level', 'FORBIDDEN'),
        { status: 403 }
      )
    }
  }

  const result = await processApproval({
    requestId,
    action: 'info_requested',
    approverId: caller.id,
    comment: parsed.data.comment,
  })

  if (!result.success) {
    return NextResponse.json(apiError(result.error ?? 'Action failed', 'APPROVAL_ERROR'), { status: 400 })
  }

  return NextResponse.json(apiSuccess({ newStatus: result.newStatus }))
}
