import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRequest, submitRequest } from '@/lib/data/spend-requests'
import { apiSuccess, apiError } from '@/types/api'
import { sendApprovalNeeded } from '@/lib/notifications/send'

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

export async function POST(_request: NextRequest, { params }: { params: Params }) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { id } = await params

  const existing = await getRequest(id)
  if (!existing) {
    return NextResponse.json(apiError('Request not found', 'NOT_FOUND'), { status: 404 })
  }

  if (existing.requester_id !== caller.id) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      apiError('Only draft requests can be submitted', 'INVALID_STATUS'),
      { status: 400 }
    )
  }

  try {
    const submitted = await submitRequest(id, caller.id)

    // Fire-and-forget: notify L1 approvers
    notifyL1Approvers(submitted).catch((err) =>
      console.error('[notifications] L1 notify failed after submit:', err)
    )

    return NextResponse.json(apiSuccess(submitted))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Submit failed', 'SUBMIT_ERROR'),
      { status: 500 }
    )
  }
}

async function notifyL1Approvers(submitted: {
  id: string
  entity_id: string
  reference_no: string
  title: string
  type: string
  category: string
  amount: number
  currency: string
  requester_id: string
  cost_centre_id: string
  justification?: string | null
  budget_flag: boolean
  priority: string
}) {
  const service = createServiceClient()

  const [requesterRes, approversRes, costCentreRes] = await Promise.all([
    service.from('profiles').select('full_name').eq('id', submitted.requester_id).single(),
    service
      .from('profiles')
      .select('id, full_name, email')
      .eq('entity_id', submitted.entity_id)
      .eq('role', 'approver_l1')
      .eq('active', true),
    service.from('cost_centres').select('code').eq('id', submitted.cost_centre_id).single(),
  ])

  await sendApprovalNeeded({
    request: {
      id: submitted.id,
      reference_no: submitted.reference_no,
      title: submitted.title,
      type: submitted.type,
      category: submitted.category,
      amount: submitted.amount,
      currency: submitted.currency,
      justification: submitted.justification ?? null,
      budget_flag: submitted.budget_flag,
      priority: submitted.priority,
    },
    requesterName: requesterRes.data?.full_name ?? 'Unknown',
    costCentreCode: costCentreRes.data?.code ?? '',
    approvers: approversRes.data ?? [],
  })
}
