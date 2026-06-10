import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { processApproval } from '@/lib/approvals/processApproval'
import { apiSuccess, apiError } from '@/types/api'

type Params = Promise<{ id: string }>

const bodySchema = z.object({
  comment: z.string().max(2000).optional().nullable(),
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

  // Parse body (comment is optional for approve)
  let comment: string | null = null
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (parsed.success) comment = parsed.data.comment ?? null
  } catch {
    // no body is fine
  }

  // Verify caller is an approver-type role or admin
  const approverRoles = ['approver_l1', 'approver_l2', 'approver_l3', 'admin', 'group_admin', 'procurement_officer']
  if (!approverRoles.includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden — approver role required', 'FORBIDDEN'), { status: 403 })
  }

  // Verify entity scope and level authorization
  const service = createServiceClient()
  const { data: req } = await service
    .from('spend_requests')
    .select('entity_id, category, current_level, status')
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
      apiError(`Cannot approve a request with status "${req.status}"`, 'INVALID_STATUS'),
      { status: 400 }
    )
  }

  // Check role matches required level (admin/group_admin bypass)
  if (caller.role !== 'admin' && caller.role !== 'group_admin' && caller.role !== 'procurement_officer') {
    const expectedRole = `approver_l${req.current_level}`
    if (caller.role !== expectedRole) {
      return NextResponse.json(
        apiError('Not authorized to approve at this level', 'FORBIDDEN'),
        { status: 403 }
      )
    }
  }

  const result = await processApproval({
    requestId,
    action: 'approve',
    approverId: caller.id,
    comment: comment ?? undefined,
  })

  if (!result.success) {
    return NextResponse.json(apiError(result.error ?? 'Approval failed', 'APPROVAL_ERROR'), { status: 400 })
  }

  return NextResponse.json(apiSuccess({ newStatus: result.newStatus }))
}
