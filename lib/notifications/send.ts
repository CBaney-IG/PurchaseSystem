import { Resend } from 'resend'
import { render } from '@react-email/components'
import { signEmailToken } from './emailTokens'
import ApprovalNeeded from '@/emails/ApprovalNeeded'
import RequestApproved from '@/emails/RequestApproved'
import RequestRejected from '@/emails/RequestRejected'
import InfoRequested from '@/emails/InfoRequested'
import POCreated from '@/emails/POCreated'
import BudgetWarning from '@/emails/BudgetWarning'
import DelegationActive from '@/emails/DelegationActive'
import ApprovalReminder from '@/emails/ApprovalReminder'
import ApprovalEscalated from '@/emails/ApprovalEscalated'

function isStubKey(): boolean {
  return (process.env.RESEND_API_KEY ?? '').startsWith('re_stub')
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'noreply@bpogroup.co.za'
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3003'
}

export interface SendResult {
  sent: boolean
  reason?: string
}

export interface ApprovalNeededParams {
  request: {
    id: string
    reference_no: string
    title: string
    type: string
    category: string
    amount: number
    currency: string
    justification: string | null
    budget_flag: boolean
    priority: string
  }
  requesterName: string
  costCentreCode: string
  approvers: { id: string; email: string; full_name: string }[]
}

export async function sendApprovalNeeded(params: ApprovalNeededParams): Promise<SendResult> {
  const { request, requesterName, costCentreCode, approvers } = params
  const appUrl = getAppUrl()

  if (approvers.length === 0) {
    console.warn('[email] sendApprovalNeeded: no approvers found for request', request.reference_no)
    return { sent: false, reason: 'no_approvers' }
  }

  if (isStubKey()) {
    console.log('[email:stub] sendApprovalNeeded', {
      to: approvers.map((a) => a.email),
      subject: `[Action Required] Approval Request — ${request.reference_no}: ${request.title}`,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()

  await Promise.all(
    approvers.map(async (approver) => {
      const [approveToken, rejectToken] = await Promise.all([
        signEmailToken({ requestId: request.id, approverId: approver.id, action: 'approve' }),
        signEmailToken({ requestId: request.id, approverId: approver.id, action: 'reject' }),
      ])

      const approveUrl = `${appUrl}/api/approvals/email-action?token=${encodeURIComponent(approveToken)}`
      const rejectUrl = `${appUrl}/api/approvals/email-action?token=${encodeURIComponent(rejectToken)}`

      const html = await render(
        ApprovalNeeded({
          requestRef: request.reference_no,
          requestTitle: request.title,
          requestType: request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim',
          category: request.category,
          amount: request.amount,
          currency: request.currency,
          requesterName,
          costCentreCode,
          justification: request.justification,
          priority: request.priority,
          budgetFlag: request.budget_flag,
          approverName: approver.full_name,
          approveUrl,
          rejectUrl,
          platformUrl: `${appUrl}/approvals`,
        })
      )

      await resend.emails.send({
        from,
        to: approver.email,
        subject: `[Action Required] Approval Request — ${request.reference_no}: ${request.title}`,
        html,
      })
    })
  )

  return { sent: true }
}

export interface RequestOutcomeParams {
  request: {
    reference_no: string
    title: string
    type: string
    amount: number
    currency: string
  }
  requester: { email: string; full_name: string }
  outcome: 'approved' | 'rejected'
  rejectionReason?: string
}

export async function sendRequestOutcome(params: RequestOutcomeParams): Promise<SendResult> {
  const { request, requester, outcome, rejectionReason } = params
  const appUrl = getAppUrl()

  if (isStubKey()) {
    console.log(`[email:stub] sendRequestOutcome(${outcome})`, {
      to: requester.email,
      subject:
        outcome === 'approved'
          ? `Approved: ${request.reference_no} — ${request.title}`
          : `Rejected: ${request.reference_no} — ${request.title}`,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()

  if (outcome === 'approved') {
    const html = await render(
      RequestApproved({
        requestRef: request.reference_no,
        requestTitle: request.title,
        requestType: request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim',
        amount: request.amount,
        currency: request.currency,
        requesterName: requester.full_name,
        platformUrl: `${appUrl}/requests`,
      })
    )

    await resend.emails.send({
      from,
      to: requester.email,
      subject: `Approved: ${request.reference_no} — ${request.title}`,
      html,
    })
  } else {
    const html = await render(
      RequestRejected({
        requestRef: request.reference_no,
        requestTitle: request.title,
        requestType: request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim',
        amount: request.amount,
        currency: request.currency,
        requesterName: requester.full_name,
        rejectionReason: rejectionReason ?? 'No reason provided.',
        platformUrl: `${appUrl}/requests`,
      })
    )

    await resend.emails.send({
      from,
      to: requester.email,
      subject: `Rejected: ${request.reference_no} — ${request.title}`,
      html,
    })
  }

  return { sent: true }
}

export interface InfoRequestedParams {
  request: {
    reference_no: string
    title: string
  }
  requester: { email: string; full_name: string }
  approverName: string
  question: string
}

export async function sendInfoRequested(params: InfoRequestedParams): Promise<SendResult> {
  const { request, requester, approverName, question } = params
  const appUrl = getAppUrl()

  if (isStubKey()) {
    console.log('[email:stub] sendInfoRequested', {
      to: requester.email,
      subject: `[Action Required] More information needed — ${request.reference_no}: ${request.title}`,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const html = await render(
    InfoRequested({
      requestRef: request.reference_no,
      requestTitle: request.title,
      requesterName: requester.full_name,
      approverName,
      question,
      platformUrl: `${appUrl}/requests`,
    })
  )

  await resend.emails.send({
    from: getFromAddress(),
    to: requester.email,
    subject: `[Action Required] More information needed — ${request.reference_no}: ${request.title}`,
    html,
  })

  return { sent: true }
}

export interface POCreatedParams {
  po: {
    reference_no: string
    amount: number
    currency: string
  }
  pr: {
    reference_no: string
    title: string
    vendor_name: string | null
  }
  procurementOfficers: { email: string; full_name: string }[]
  poUrl: string
}

export async function sendPOCreated(params: POCreatedParams): Promise<SendResult> {
  const { po, pr, procurementOfficers, poUrl } = params

  if (procurementOfficers.length === 0) {
    console.warn('[email] sendPOCreated: no procurement officers found')
    return { sent: false, reason: 'no_recipients' }
  }

  if (isStubKey()) {
    console.log('[email:stub] sendPOCreated', {
      to: procurementOfficers.map((p) => p.email),
      subject: `New PO draft ready: ${po.reference_no} — ${pr.title}`,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()

  await Promise.all(
    procurementOfficers.map(async (officer) => {
      const html = await render(
        POCreated({
          poRef: po.reference_no,
          prRef: pr.reference_no,
          prTitle: pr.title,
          vendorName: pr.vendor_name,
          amount: po.amount,
          currency: po.currency,
          procurementOfficerName: officer.full_name,
          platformUrl: poUrl,
        })
      )

      await resend.emails.send({
        from,
        to: officer.email,
        subject: `New PO draft ready: ${po.reference_no} — ${pr.title}`,
        html,
      })
    })
  )

  return { sent: true }
}

// ── Approval reminder (24h overdue) ─────────────────────────────────────────

export interface ApprovalReminderParams {
  request: {
    id: string
    reference_no: string
    title: string
    type: string
    category: string
    amount: number
    currency: string
    justification: string | null
    budget_flag: boolean
    priority: string
  }
  requesterName: string
  costCentreCode: string
  hoursOverdue: number
  approvers: { id: string; email: string; full_name: string }[]
}

export async function sendApprovalReminder(params: ApprovalReminderParams): Promise<SendResult> {
  const { request, requesterName, costCentreCode, hoursOverdue, approvers } = params

  if (approvers.length === 0) {
    console.warn('[email] sendApprovalReminder: no approvers for', request.reference_no)
    return { sent: false, reason: 'no_approvers' }
  }

  const subject = `[Reminder] Approval overdue — ${request.reference_no}: ${request.title}`
  const appUrl = getAppUrl()

  if (isStubKey()) {
    console.log('[email:stub] sendApprovalReminder', {
      to: approvers.map(a => a.email),
      subject,
      hoursOverdue,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()

  await Promise.all(
    approvers.map(async (approver) => {
      const [approveToken, rejectToken] = await Promise.all([
        signEmailToken({ requestId: request.id, approverId: approver.id, action: 'approve' }),
        signEmailToken({ requestId: request.id, approverId: approver.id, action: 'reject' }),
      ])

      const approveUrl = `${appUrl}/api/approvals/email-action?token=${encodeURIComponent(approveToken)}`
      const rejectUrl = `${appUrl}/api/approvals/email-action?token=${encodeURIComponent(rejectToken)}`

      const html = await render(
        ApprovalReminder({
          requestRef: request.reference_no,
          requestTitle: request.title,
          requestType: request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim',
          category: request.category,
          amount: request.amount,
          currency: request.currency,
          requesterName,
          costCentreCode,
          justification: request.justification,
          priority: request.priority,
          budgetFlag: request.budget_flag,
          approverName: approver.full_name,
          hoursOverdue,
          approveUrl,
          rejectUrl,
          platformUrl: `${appUrl}/approvals`,
        })
      )

      await resend.emails.send({ from, to: approver.email, subject, html })
    })
  )

  return { sent: true }
}

// ── Escalation alert ─────────────────────────────────────────────────────────

export interface EscalationAlertParams {
  request: {
    reference_no: string
    title: string
    type: string
    amount: number
    currency: string
  }
  requesterName: string
  originalApproverName: string
  hoursOverdue: number
  escalationTargets: { email: string; full_name: string }[]
  requester: { email: string; full_name: string }
}

export async function sendEscalationAlert(params: EscalationAlertParams): Promise<SendResult> {
  const { request, requesterName, originalApproverName, hoursOverdue, escalationTargets, requester } = params
  const appUrl = getAppUrl()

  const subject = `[Escalated] ${request.reference_no}: ${request.title} — manager action required`

  if (isStubKey()) {
    console.log('[email:stub] sendEscalationAlert', {
      toManagers: escalationTargets.map(t => t.email),
      toRequester: requester.email,
      subject,
      hoursOverdue,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()

  const emailData = {
    requestRef: request.reference_no,
    requestTitle: request.title,
    requestType: request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim',
    amount: request.amount,
    currency: request.currency,
    requesterName,
    hoursOverdue,
    originalApproverName,
  }

  await Promise.all([
    ...escalationTargets.map(async (target) => {
      const html = await render(
        ApprovalEscalated({
          ...emailData,
          recipientName: target.full_name,
          isManager: true,
          platformUrl: `${appUrl}/approvals`,
        })
      )
      await resend.emails.send({ from, to: target.email, subject, html })
    }),
    (async () => {
      const html = await render(
        ApprovalEscalated({
          ...emailData,
          recipientName: requester.full_name,
          isManager: false,
          platformUrl: `${appUrl}/requests`,
        })
      )
      await resend.emails.send({
        from, to: requester.email,
        subject: `Your request ${request.reference_no} has been escalated`,
        html,
      })
    })(),
  ])

  return { sent: true }
}

export interface BudgetWarningParams {
  costCentreName: string
  costCentreCode: string
  category: string
  budgetAmount: number
  committed: number
  available: number
  utilisationPct: number
  currency: string
  year: number
  recipients: { email: string; full_name: string }[]
}

export async function sendBudgetWarning(params: BudgetWarningParams): Promise<SendResult> {
  const { recipients } = params

  if (recipients.length === 0) {
    console.warn('[email] sendBudgetWarning: no recipients found')
    return { sent: false, reason: 'no_recipients' }
  }

  const pct = Math.round(params.utilisationPct)
  const subject = `[Budget Alert] ${params.costCentreCode} — ${params.category} at ${pct}% committed`

  if (isStubKey()) {
    console.log('[email:stub] sendBudgetWarning', {
      to: recipients.map((r) => r.email),
      subject,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()

  await Promise.all(
    recipients.map(async (recipient) => {
      const html = await render(
        BudgetWarning({
          ...params,
          recipientName: recipient.full_name,
        })
      )
      await resend.emails.send({ from, to: recipient.email, subject, html })
    })
  )

  return { sent: true }
}

// ── Delegation notification ──────────────────────────────────────────────────

export interface DelegationNotificationParams {
  delegator: { email: string; full_name: string }
  delegate: { email: string; full_name: string }
  validFrom: string   // formatted date string, e.g. "12 Jun 2026"
  validUntil: string
  reason: string | null
}

export async function sendDelegationNotification(
  params: DelegationNotificationParams
): Promise<SendResult> {
  const { delegator, delegate, validFrom, validUntil, reason } = params
  const appUrl = getAppUrl()

  const subject = `Approval delegation — ${delegator.full_name} → ${delegate.full_name}`

  if (isStubKey()) {
    console.log('[email:stub] sendDelegationNotification', {
      toDelegator: delegator.email,
      toDelegate: delegate.email,
      subject,
    })
    return { sent: false, reason: 'stub' }
  }

  const resend = getResend()
  const from = getFromAddress()
  const sharedData = {
    delegatorName: delegator.full_name,
    delegateName: delegate.full_name,
    validFrom,
    validUntil,
    reason,
    platformUrl: `${appUrl}/profile`,
  }

  const [delegatorHtml, delegateHtml] = await Promise.all([
    render(DelegationActive({ ...sharedData, recipientName: delegator.full_name, isDelegator: true })),
    render(DelegationActive({ ...sharedData, recipientName: delegate.full_name, isDelegator: false })),
  ])

  await Promise.all([
    resend.emails.send({ from, to: delegator.email, subject, html: delegatorHtml }),
    resend.emails.send({ from, to: delegate.email, subject, html: delegateHtml }),
  ])

  return { sent: true }
}
