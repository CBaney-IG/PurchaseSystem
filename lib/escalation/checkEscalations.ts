import { createServiceClient } from '@/lib/supabase/service'
import { sendApprovalReminder, sendEscalationAlert } from '@/lib/notifications/send'

const REMINDER_HOURS = 24
const ESCALATION_HOURS = 48

export interface EscalationReport {
  checked: number
  reminders: number
  escalations: number
  skipped: number
  errors: string[]
}

interface PendingRequest {
  id: string
  entity_id: string
  reference_no: string
  type: string
  title: string
  category: string
  amount: number
  currency: string
  priority: string
  justification: string | null
  budget_flag: boolean
  current_level: number
  status: string
  requester_id: string
  cost_centre_id: string
  updated_at: string
  requester: { id: string; full_name: string; email: string; manager_id: string | null } | null
  cost_centre: { code: string } | null
}

export async function checkEscalations(): Promise<EscalationReport> {
  const service = createServiceClient()
  const report: EscalationReport = {
    checked: 0, reminders: 0, escalations: 0, skipped: 0, errors: [],
  }

  const cutoff24h = new Date(Date.now() - REMINDER_HOURS * 60 * 60 * 1000).toISOString()
  const cutoff48h = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000).toISOString()

  // All pending requests not acted on in 24+ hours
  const { data: stale, error } = await service
    .from('spend_requests')
    .select(`
      id, entity_id, reference_no, type, title, category,
      amount, currency, priority, justification, budget_flag,
      current_level, status, requester_id, cost_centre_id, updated_at,
      requester:profiles!requester_id(id, full_name, email, manager_id),
      cost_centre:cost_centres!cost_centre_id(code)
    `)
    .in('status', ['pending_l1', 'pending_l2', 'pending_l3'])
    .lt('updated_at', cutoff24h)
    .is('deleted_at', null)
    .order('updated_at', { ascending: true })
    .limit(100)

  if (error) {
    report.errors.push(`Failed to fetch stale requests: ${error.message}`)
    return report
  }

  const requests = ((stale ?? []) as unknown as PendingRequest[])
  report.checked = requests.length

  for (const req of requests) {
    try {
      await processOne(service, req, cutoff48h, report)
    } catch (err) {
      report.errors.push(`${req.reference_no}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return report
}

async function processOne(
  service: ReturnType<typeof createServiceClient>,
  req: PendingRequest,
  cutoff48h: string,
  report: EscalationReport
): Promise<void> {
  const hoursStale = Math.round(
    (Date.now() - new Date(req.updated_at).getTime()) / (1000 * 60 * 60)
  )

  const isEscalationCandidate = req.updated_at < cutoff48h

  if (isEscalationCandidate) {
    // Check if already escalated since last status change
    const { data: existingEscalation } = await service
      .from('approval_events')
      .select('id')
      .eq('request_id', req.id)
      .eq('action', 'escalated')
      .gt('created_at', req.updated_at)
      .maybeSingle()

    if (existingEscalation) {
      report.skipped++
      return
    }

    await escalateRequest(service, req, hoursStale, report)
  } else {
    // 24h candidate — check if reminder already sent since last status change
    const { data: existingReminder } = await service
      .from('notifications')
      .select('id')
      .eq('request_id', req.id)
      .eq('type', 'approval_reminder')
      .gt('created_at', req.updated_at)
      .maybeSingle()

    if (existingReminder) {
      report.skipped++
      return
    }

    await sendReminder(service, req, hoursStale, report)
  }
}

async function sendReminder(
  service: ReturnType<typeof createServiceClient>,
  req: PendingRequest,
  hoursStale: number,
  report: EscalationReport
): Promise<void> {
  const approverRole = `approver_l${req.current_level}`

  const { data: approvers } = await service
    .from('profiles')
    .select('id, full_name, email')
    .eq('entity_id', req.entity_id)
    .eq('role', approverRole)
    .eq('active', true)

  if (!approvers || approvers.length === 0) {
    report.errors.push(`${req.reference_no}: no approvers found for ${approverRole}`)
    return
  }

  const requester = req.requester
  const costCentreCode = req.cost_centre?.code ?? ''

  await sendApprovalReminder({
    request: {
      id: req.id,
      reference_no: req.reference_no,
      title: req.title,
      type: req.type,
      category: req.category,
      amount: Number(req.amount),
      currency: req.currency,
      justification: req.justification,
      budget_flag: req.budget_flag,
      priority: req.priority,
    },
    requesterName: requester?.full_name ?? 'Unknown',
    costCentreCode,
    hoursOverdue: hoursStale,
    approvers: approvers as { id: string; email: string; full_name: string }[],
  })

  // Insert notification record to prevent duplicate reminders
  await Promise.all(
    approvers.map(a =>
      service.from('notifications').insert({
        user_id: a.id,
        request_id: req.id,
        type: 'approval_reminder',
        title: `Reminder: ${req.reference_no} awaiting your approval`,
        body: `This request has been waiting ${hoursStale} hours for your action.`,
        email_sent: true,
      })
    )
  )

  report.reminders++
}

async function escalateRequest(
  service: ReturnType<typeof createServiceClient>,
  req: PendingRequest,
  hoursStale: number,
  report: EscalationReport
): Promise<void> {
  const approverRole = `approver_l${req.current_level}`
  const requester = req.requester

  // Find current approvers and their managers
  const { data: approvers } = await service
    .from('profiles')
    .select('id, full_name, email, manager_id')
    .eq('entity_id', req.entity_id)
    .eq('role', approverRole)
    .eq('active', true)

  const managerIds = [
    ...new Set(
      (approvers ?? [])
        .map(a => (a as { manager_id: string | null }).manager_id)
        .filter(Boolean) as string[]
    ),
  ]

  let escalationTargets: { id: string; full_name: string; email: string }[] = []
  const originalApproverName =
    (approvers ?? []).map(a => a.full_name).join(', ') || 'the approver'

  if (managerIds.length > 0) {
    const { data: managers } = await service
      .from('profiles')
      .select('id, full_name, email')
      .in('id', managerIds)
      .eq('active', true)
    escalationTargets = (managers ?? []) as { id: string; full_name: string; email: string }[]
  }

  // Fallback to group_admin if no managers found
  if (escalationTargets.length === 0) {
    const { data: admins } = await service
      .from('profiles')
      .select('id, full_name, email')
      .eq('entity_id', req.entity_id)
      .eq('role', 'group_admin')
      .eq('active', true)
    escalationTargets = (admins ?? []) as { id: string; full_name: string; email: string }[]
    console.warn(
      `[escalation] ${req.reference_no}: no manager found for ${approverRole}, ` +
      `escalating to group_admin (${escalationTargets.length} targets)`
    )
  }

  if (escalationTargets.length === 0) {
    report.errors.push(
      `${req.reference_no}: no escalation targets found — no managers or group_admin`
    )
    return
  }

  // Insert approval_event for audit trail
  await service.from('approval_events').insert({
    request_id: req.id,
    // Use first escalation target as "approver" for audit purposes
    approver_id: escalationTargets[0].id,
    level: req.current_level,
    action: 'escalated',
    comment: `Auto-escalated after ${hoursStale} hours without action by ${originalApproverName}.`,
    previous_status: req.status,
    new_status: req.status,
    metadata: {
      original_approver_role: approverRole,
      escalated_to_ids: escalationTargets.map(t => t.id),
      hours_stale: hoursStale,
    },
  })

  // Insert in-app notifications for escalation targets
  await Promise.all(
    escalationTargets.map(t =>
      service.from('notifications').insert({
        user_id: t.id,
        request_id: req.id,
        type: 'approval_escalated',
        title: `Escalated to you: ${req.reference_no}`,
        body: `${req.title} — escalated after ${hoursStale}h without action.`,
        email_sent: true,
      })
    )
  )

  // Send emails
  if (requester) {
    await sendEscalationAlert({
      request: {
        reference_no: req.reference_no,
        title: req.title,
        type: req.type,
        amount: Number(req.amount),
        currency: req.currency,
      },
      requesterName: requester.full_name,
      originalApproverName,
      hoursOverdue: hoursStale,
      escalationTargets,
      requester,
    }).catch(err =>
      console.error('[escalation] sendEscalationAlert failed:', err)
    )
  }

  report.escalations++
}
