import { Resend } from 'resend'
import { render } from '@react-email/components'
import { signEmailToken } from './emailTokens'
import ApprovalNeeded from '@/emails/ApprovalNeeded'
import RequestApproved from '@/emails/RequestApproved'
import RequestRejected from '@/emails/RequestRejected'
import InfoRequested from '@/emails/InfoRequested'

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
