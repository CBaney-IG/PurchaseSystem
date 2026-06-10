import { createServiceClient } from '@/lib/supabase/service'
import { getNextRequiredLevel } from './matrix'
import type { SpendRequestStatus } from '@/types/domain'

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

  return { success: true, newStatus }
}
