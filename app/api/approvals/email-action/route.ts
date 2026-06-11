import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken, markTokenConsumed } from '@/lib/notifications/emailTokens'
import { processApproval } from '@/lib/approvals/processApproval'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3003'

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// ---- HTML page helpers ----

function htmlPage(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Spend Management Platform</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background: #f8fafc; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; padding: 24px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
            max-width: 480px; width: 100%; padding: 40px 36px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
             font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
             padding: 4px 10px; border-radius: 4px; margin-bottom: 20px; }
    .badge-green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-red   { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    h1 { margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; }
    p  { margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6; }
    a  { color: #2563eb; }
    label { display: block; font-size: 13px; font-weight: 600; color: #374151;
            margin-bottom: 6px; margin-top: 16px; }
    textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px;
               font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px;
               color: #0f172a; }
    textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
    .error { color: #b91c1c; font-size: 13px; margin: 6px 0 0; display: none; }
    button { display: block; width: 100%; margin-top: 16px; padding: 12px 24px;
             background: #dc2626; color: #fff; font-size: 14px; font-weight: 600;
             border: none; border-radius: 6px; cursor: pointer; }
    button:hover { background: #b91c1c; }
    .platform-link { margin-top: 24px; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  )
}

function confirmationPage(action: 'approve' | 'reject', ref?: string): NextResponse {
  const isApprove = action === 'approve'
  return htmlPage(
    isApprove ? 'Request approved' : 'Request rejected',
    `
    <div class="badge ${isApprove ? 'badge-green' : 'badge-red'}">
      ${isApprove ? '✓ Approved' : '✕ Rejected'}
    </div>
    <h1>${isApprove ? 'Request approved' : 'Request rejected'}</h1>
    <p>
      ${ref ? `<strong>${esc(ref)}</strong> has been ` : 'The request has been '}
      ${isApprove ? 'approved' : 'rejected'}. The requester will be notified.
    </p>
    <p class="platform-link">
      <a href="${APP_URL}/approvals">Go to approvals inbox</a>
    </p>
    `
  )
}

function errorPage(
  heading: string,
  message: string,
  badge: 'amber' | 'red' = 'amber'
): NextResponse {
  return htmlPage(
    heading,
    `
    <div class="badge badge-${badge}">${heading}</div>
    <h1>${heading}</h1>
    <p>${message}</p>
    <p class="platform-link">
      <a href="${APP_URL}/approvals">Go to approvals inbox</a>
    </p>
    `
  )
}

function rejectFormPage(token: string, ref: string, title: string): NextResponse {
  return htmlPage(
    'Reject request',
    `
    <div class="badge badge-red">Reject request</div>
    <h1>Reject: ${esc(ref)}</h1>
    <p>${esc(title)}</p>
    <p>Please provide a reason for rejecting this request. The requester will see this reason.</p>
    <form method="POST" action="/api/approvals/email-action" onsubmit="return validate()">
      <input type="hidden" name="token" value="${token.replace(/"/g, '&quot;')}" />
      <label for="reason">Reason for rejection</label>
      <textarea id="reason" name="reason" placeholder="Minimum 10 characters..." required></textarea>
      <p id="err" class="error">Please provide at least 10 characters.</p>
      <button type="submit">Confirm rejection</button>
    </form>
    <p class="platform-link">Changed your mind? <a href="${APP_URL}/approvals">Go to inbox instead</a></p>
    <script>
      function validate() {
        var reason = document.getElementById('reason').value;
        var err = document.getElementById('err');
        if (reason.trim().length < 10) {
          err.style.display = 'block';
          return false;
        }
        err.style.display = 'none';
        return true;
      }
    </script>
    `
  )
}

// ---- GET handler ----

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return errorPage('Invalid link', 'This approval link is missing required information.', 'red')
  }

  const result = await verifyEmailToken(token)

  if (!result.valid) {
    if (result.reason === 'expired') {
      return errorPage(
        'Link expired',
        `This approval link has expired (valid for 48 hours). Please <a href="${APP_URL}/approvals">log in to the approvals inbox</a> to take action.`
      )
    }
    if (result.reason === 'consumed') {
      return errorPage(
        'Already actioned',
        'This approval link has already been used. The action has been recorded.'
      )
    }
    return errorPage('Invalid link', 'This approval link is invalid or has been tampered with.', 'red')
  }

  const { payload } = result

  // For reject: show the form page; don't consume the token yet
  if (payload.action === 'reject') {
    // Fetch the request title for the form page
    const { createServiceClient } = await import('@/lib/supabase/service')
    const service = createServiceClient()
    const { data: req } = await service
      .from('spend_requests')
      .select('reference_no, title')
      .eq('id', payload.requestId)
      .single()

    return rejectFormPage(
      token,
      req?.reference_no ?? payload.requestId,
      req?.title ?? ''
    )
  }

  // Approve: execute immediately
  await markTokenConsumed(payload)

  const approval = await processApproval({
    requestId: payload.requestId,
    action: 'approve',
    approverId: payload.approverId,
  })

  if (!approval.success) {
    return errorPage(
      'Action failed',
      `Could not process this approval: ${approval.error ?? 'unknown error'}. Please <a href="${APP_URL}/approvals">log in to take action</a>.`,
      'red'
    )
  }

  // Fetch reference number for confirmation
  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { data: req } = await service
    .from('spend_requests')
    .select('reference_no')
    .eq('id', payload.requestId)
    .single()

  return confirmationPage('approve', req?.reference_no)
}

// ---- POST handler (reject form submission) ----

export async function POST(request: NextRequest): Promise<NextResponse> {
  let token: string | null = null
  let reason: string | null = null

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    token = params.get('token')
    reason = params.get('reason')
  } else {
    try {
      const body = await request.json()
      token = body.token ?? null
      reason = body.reason ?? null
    } catch {
      // ignore
    }
  }

  if (!token) {
    return errorPage('Invalid request', 'Token is missing from the rejection form.', 'red')
  }

  if (!reason || reason.trim().length < 10) {
    return errorPage(
      'Reason too short',
      'Rejection reason must be at least 10 characters. Please go back and try again.',
      'amber'
    )
  }

  // Re-verify token (signature, expiry, and not yet consumed)
  const result = await verifyEmailToken(token)

  if (!result.valid) {
    if (result.reason === 'expired') {
      return errorPage(
        'Link expired',
        `This approval link has expired. Please <a href="${APP_URL}/approvals">log in</a> to take action.`
      )
    }
    if (result.reason === 'consumed') {
      return errorPage('Already actioned', 'This rejection has already been recorded.')
    }
    return errorPage('Invalid link', 'This link is invalid or has been tampered with.', 'red')
  }

  const { payload } = result

  if (payload.action !== 'reject') {
    return errorPage('Invalid request', 'This link is not a rejection link.', 'red')
  }

  await markTokenConsumed(payload)

  const approval = await processApproval({
    requestId: payload.requestId,
    action: 'reject',
    approverId: payload.approverId,
    comment: reason.trim(),
  })

  if (!approval.success) {
    return errorPage(
      'Action failed',
      `Could not process this rejection: ${approval.error ?? 'unknown error'}. Please <a href="${APP_URL}/approvals">log in to take action</a>.`,
      'red'
    )
  }

  // Fetch reference number for confirmation
  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { data: req } = await service
    .from('spend_requests')
    .select('reference_no')
    .eq('id', payload.requestId)
    .single()

  return confirmationPage('reject', req?.reference_no)
}
