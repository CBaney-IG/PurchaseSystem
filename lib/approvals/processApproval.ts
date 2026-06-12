import { createServiceClient } from '@/lib/supabase/service'
import { getNextRequiredLevel } from './matrix'
import type { SpendRequestStatus } from '@/types/domain'
import {
  sendApprovalNeeded,
  sendRequestOutcome,
  sendInfoRequested,
  sendPOCreated,
} from '@/lib/notifications/send'
import { generatePOFromApprovedRequest } from './generatePO'
import { updateCommitted } from '@/lib/data/budgets'
import { transformApprovalEvent } from '@/lib/snowflake/transform'
import { pushApprovalEvent } from '@/lib/snowflake/push'
import type { ApprovalEventRow, SpendRequestRow } from '@/lib/snowflake/transform'

// ---- Types ----

export type ProcessApprovalAction = 'approve' | 'reject' | 'info_requested' | 'info_provided'

export interface ProcessApprovalParams {
  requestId: string
  action: ProcessApprovalAction
  approverId: string
  comment?: string
}

export interface ProcessApprovalResult {
  success: boolean
  newStatus: SpendRequestStatus
  error?: string
}

// ---- Helpers ----

export function levelToStatus(level: number): SpendRequestStatus {
  const map: Partial<Record<number, SpendRequestStatus>> = {
    1: 'pending_l1',
    2: 'pending_l2',
    3: 'pending_l3',
  }
  // Levels 4-6 are supported in approval_matrices but the status enum caps at l3.
  // Cap to pending_l3 while current_level still tracks the real number.
  return map[level] ?? 'pending_l3'
}

export function statusToLevel(status: SpendRequestStatus): number | null {
  if (status === 'pending_l1') return 1
  if (status === 'pending_l2') return 2
  if (status === 'pending_l3') return 3
  return null
}

// ---- Core engine ----

export async function processApproval(
  params: ProcessApprovalParams
): Promise<ProcessApprovalResult> {
  const { requestId, action, approverId, comment } = params
  const service = createServiceClient()

  // 1. Fetch the request
  const { data: request, error: fetchErr } = await service
    .from('spend_requests')
    .select('*')
    .eq('id', requestId)
    .is('deleted_at', null)
    .single()

  if (fetchErr || !request) {
    return { success: false, newStatus: 'draft', error: 'Request not found' }
  }

  const currentStatus = request.status as SpendRequestStatus
  const currentLevel = request.current_level as number

  // 2. Validate the action is valid for the current status
  if (action === 'info_provided') {
    if (currentStatus !== 'pending_info') {
      return {
        success: false,
        newStatus: currentStatus,
        error: 'Request is not awaiting additional information',
      }
    }
  } else {
    if (!currentStatus.startsWith('pending_l')) {
      return {
        success: false,
        newStatus: currentStatus,
        error: `Cannot ${action} a request with status "${currentStatus}"`,
      }
    }
  }

  // 3. Validate comment requirements
  if (action === 'reject' && (!comment || comment.trim().length < 10)) {
    return {
      success: false,
      newStatus: currentStatus,
      error: 'Rejection reason must be at least 10 characters',
    }
  }
  if (action === 'info_requested' && (!comment || comment.trim().length === 0)) {
    return {
      success: false,
      newStatus: currentStatus,
      error: 'A question is required when requesting more information',
    }
  }

  // 4. Determine new status
  let newStatus: SpendRequestStatus
  let newLevel = currentLevel

  if (action === 'approve') {
    const { data: matrixRows } = await service
      .from('approval_matrices')
      .select('*')
      .eq('entity_id', request.entity_id)
      .eq('category', request.category)
      .eq('active', true)
      .order('level')

    const next = getNextRequiredLevel(matrixRows ?? [], currentLevel, request.amount as number)

    if (next === null) {
      newStatus = 'approved'
    } else {
      newLevel = next.level
      newStatus = levelToStatus(next.level)
    }
  } else if (action === 'reject') {
    newStatus = 'rejected'
  } else if (action === 'info_requested') {
    newStatus = 'pending_info'
  } else {
    // info_provided — return to the level that was waiting
    newStatus = levelToStatus(currentLevel)
  }

  // 5. Update the request
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    current_level: newLevel,
  }
  if (newStatus === 'approved') {
    updatePayload.approved_at = new Date().toISOString()
  }

  const { error: updateErr } = await service
    .from('spend_requests')
    .update(updatePayload)
    .eq('id', requestId)

  if (updateErr) {
    return { success: false, newStatus: currentStatus, error: updateErr.message }
  }

  // 6. Insert immutable approval_event
  const eventAction =
    action === 'approve'
      ? 'approved'
      : action === 'reject'
        ? 'rejected'
        : action === 'info_requested'
          ? 'info_requested'
          : 'info_provided'

  const { error: eventErr } = await service.from('approval_events').insert({
    request_id: requestId,
    approver_id: approverId,
    level: currentLevel,
    action: eventAction,
    comment: comment?.trim() ?? null,
    previous_status: currentStatus,
    new_status: newStatus,
  })

  if (eventErr) {
    return { success: false, newStatus: currentStatus, error: eventErr.message }
  }

  // 7. Fire-and-forget: push approval event to Snowflake
  // Works locally without Supabase DB Webhook configured.
  // In production the DB Webhook also fires as a belt-and-suspenders fallback.
  const snowflakePayload = transformApprovalEvent(
    {
      id: 'pending', // actual ID not returned by insert; webhook handler will re-fetch if needed
      request_id: requestId,
      approver_id: approverId,
      level: currentLevel,
      action: eventAction,
      comment: comment?.trim() ?? null,
      previous_status: currentStatus,
      new_status: newStatus,
      metadata: null,
      created_at: new Date().toISOString(),
    } satisfies ApprovalEventRow,
    { ...request, amount: request.amount as number } as unknown as SpendRequestRow
  )
  pushApprovalEvent(snowflakePayload).catch(err =>
    console.error('[snowflake] pushApprovalEvent failed:', err)
  )

  // 7a. Decrement committed spend on rejection — fire-and-forget
  if (action === 'reject') {
    const year = new Date().getFullYear()
    updateCommitted({
      costCentreId: request.cost_centre_id as string,
      category: request.category as string,
      year,
      delta: -(request.amount as number),
    }).catch((err) => console.error('[budget] rejection decrement failed:', err))
  }

  // 7b. Fire-and-forget PO generation (purchase_requests only, on final approval)
  if (newStatus === 'approved' && request.type === 'purchase_request') {
    generatePOFromApprovedRequest(requestId)
      .then((result) => {
        if (!result.success) {
          console.error('[generatePO] failed:', result.error)
          return
        }
        // Notify procurement officers of the new PO draft
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3003'
        notifyProcurementOfficers({
          service,
          request,
          poRef: result.poRef!,
          poUrl: `${appUrl}/purchase-orders`,
        }).catch((err) => console.error('[notifications] PO notify failed:', err))
      })
      .catch((err) => console.error('[generatePO] threw:', err))
  }

  // 8. Fire-and-forget notifications — failure must not abort the approval
  dispatchNotifications({
    service,
    request,
    action,
    newStatus,
    newLevel,
    comment,
    approverId,
  }).catch((err) => console.error('[notifications] dispatch failed:', err))

  return { success: true, newStatus }
}

// ---- Notification dispatch (fire-and-forget) ----

async function dispatchNotifications({
  service,
  request,
  action,
  newStatus,
  newLevel,
  comment,
  approverId,
}: {
  service: ReturnType<typeof createServiceClient>
  request: Record<string, unknown>
  action: ProcessApprovalAction
  newStatus: SpendRequestStatus
  newLevel: number
  comment?: string
  approverId: string
}) {
  // Fetch requester profile (needed for most notification types)
  const { data: requester } = await service
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', request.requester_id as string)
    .single()

  if (!requester) return

  const reqData = {
    id: request.id as string,
    reference_no: request.reference_no as string,
    title: request.title as string,
    type: request.type as string,
    category: request.category as string,
    amount: request.amount as number,
    currency: (request.currency as string) ?? 'ZAR',
    justification: (request.justification as string | null) ?? null,
    budget_flag: (request.budget_flag as boolean) ?? false,
    priority: (request.priority as string) ?? 'normal',
  }

  if (newStatus === 'approved' || newStatus === 'rejected') {
    await sendRequestOutcome({
      request: reqData,
      requester,
      outcome: newStatus,
      rejectionReason: newStatus === 'rejected' ? comment : undefined,
    })
    return
  }

  if (newStatus === 'pending_info') {
    const { data: approverProfile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', approverId)
      .single()

    await sendInfoRequested({
      request: reqData,
      requester,
      approverName: approverProfile?.full_name ?? 'An approver',
      question: comment ?? '',
    })
    return
  }

  if (newStatus.startsWith('pending_l') && action === 'approve') {
    const approverRole = `approver_l${newLevel}`
    const { data: approvers } = await service
      .from('profiles')
      .select('id, full_name, email')
      .eq('entity_id', request.entity_id as string)
      .eq('role', approverRole)
      .eq('active', true)

    const { data: costCentre } = await service
      .from('cost_centres')
      .select('code')
      .eq('id', request.cost_centre_id as string)
      .single()

    await sendApprovalNeeded({
      request: reqData,
      requesterName: requester.full_name,
      costCentreCode: costCentre?.code ?? '',
      approvers: approvers ?? [],
    })
  }
}

// ---- PO notification (fire-and-forget) ----

async function notifyProcurementOfficers({
  service,
  request,
  poRef,
  poUrl,
}: {
  service: ReturnType<typeof createServiceClient>
  request: Record<string, unknown>
  poRef: string
  poUrl: string
}) {
  const { data: officers } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('entity_id', request.entity_id as string)
    .eq('role', 'procurement_officer')
    .eq('active', true)

  await sendPOCreated({
    po: {
      reference_no: poRef,
      amount: request.amount as number,
      currency: (request.currency as string) ?? 'ZAR',
    },
    pr: {
      reference_no: request.reference_no as string,
      title: request.title as string,
      vendor_name: (request.vendor_name as string | null) ?? null,
    },
    procurementOfficers: officers ?? [],
    poUrl,
  })
}
