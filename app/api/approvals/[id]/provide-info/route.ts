import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { processApproval } from '@/lib/approvals/processApproval'
import { apiSuccess, apiError } from '@/types/api'

type Params = Promise<{ id: string }>

const bodySchema = z.object({
  comment: z.string().min(1, 'Response is required').max(2000),
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

  const service = createServiceClient()
  const { data: req } = await service
    .from('spend_requests')
    .select('requester_id, entity_id, status')
    .eq('id', requestId)
    .is('deleted_at', null)
    .single()

  if (!req) {
    return NextResponse.json(apiError('Request not found', 'NOT_FOUND'), { status: 404 })
  }

  // Only the requester can provide additional information
  if (req.requester_id !== caller.id) {
    return NextResponse.json(
      apiError('Only the requester can provide additional information', 'FORBIDDEN'),
      { status: 403 }
    )
  }

  if (req.status !== 'pending_info') {
    return NextResponse.json(
      apiError('Request is not awaiting additional information', 'INVALID_STATUS'),
      { status: 400 }
    )
  }

  const result = await processApproval({
    requestId,
    action: 'info_provided',
    approverId: caller.id,
    comment: parsed.data.comment,
  })

  if (!result.success) {
    return NextResponse.json(apiError(result.error ?? 'Action failed', 'APPROVAL_ERROR'), { status: 400 })
  }

  return NextResponse.json(apiSuccess({ newStatus: result.newStatus }))
}
