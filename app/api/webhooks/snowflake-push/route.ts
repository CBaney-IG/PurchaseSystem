import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { transformApprovalEvent } from '@/lib/snowflake/transform'
import { pushApprovalEvent } from '@/lib/snowflake/push'
import type { ApprovalEventRow, SpendRequestRow } from '@/lib/snowflake/transform'

/**
 * POST /api/webhooks/snowflake-push
 *
 * Receives Supabase Database Webhook events (INSERT on approval_events,
 * UPDATE on spend_requests) and pushes transformed payloads to Snowflake.
 *
 * Auth: x-webhook-secret header validated against SNOWFLAKE_WEBHOOK_SECRET.
 * Always returns 200 — prevents Supabase retry storm on 5xx.
 *
 * Set up in Supabase Dashboard:
 *   Database > Webhooks > New Webhook
 *   Table: approval_events, Event: INSERT
 *   URL: {APP_URL}/api/webhooks/snowflake-push
 *   Headers: x-webhook-secret: {SNOWFLAKE_WEBHOOK_SECRET}
 */

interface SupabaseWebhookBody {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: Record<string, unknown>
  old_record: Record<string, unknown> | null
  schema: string
}

export async function POST(request: NextRequest) {
  // Validate shared secret
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.SNOWFLAKE_WEBHOOK_SECRET) {
    console.warn('[snowflake-push] invalid webhook secret')
    return new Response('Unauthorized', { status: 401 })
  }

  let body: SupabaseWebhookBody
  try {
    body = (await request.json()) as SupabaseWebhookBody
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  // Only handle INSERT on approval_events
  if (body.table !== 'approval_events' || body.type !== 'INSERT') {
    return new Response('OK', { status: 200 })
  }

  const event = body.record as unknown as ApprovalEventRow

  // Fetch the linked spend_request
  const service = createServiceClient()
  const { data: request2, error } = await service
    .from('spend_requests')
    .select('*')
    .eq('id', event.request_id)
    .single()

  if (error || !request2) {
    console.error('[snowflake-push] could not fetch spend_request', event.request_id, error?.message)
    // Return 200 — Supabase should not retry for a data error
    return new Response('OK', { status: 200 })
  }

  const payload = transformApprovalEvent(event, request2 as unknown as SpendRequestRow)

  // Fire-and-forget is intentional — we always return 200 quickly
  pushApprovalEvent(payload).catch(err =>
    console.error('[snowflake-push] pushApprovalEvent threw:', err)
  )

  return new Response('OK', { status: 200 })
}
