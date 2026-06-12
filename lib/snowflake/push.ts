import { createServiceClient } from '@/lib/supabase/service'
import type { SnowflakeApprovalPayload, SnowflakeBudgetPayload } from './transform'

// Stub mode: URL absent or starts with "STUB"
function isStubMode(url: string | undefined): boolean {
  return !url || url.toUpperCase().startsWith('STUB')
}

interface LogOpts {
  type: 'snowflake_approval_event' | 'snowflake_budget_sync'
  payload: unknown
  status: 'sent' | 'failed'
  lastError?: string
  existingLogId?: string
}

async function writeWebhookLog(opts: LogOpts): Promise<string | null> {
  try {
    const service = createServiceClient()
    if (opts.existingLogId) {
      // Update existing retry row
      await service
        .from('webhook_logs')
        .update({
          status: opts.status,
          attempts: service.rpc as unknown,  // incremented by DB trigger ideally; just overwrite for now
          last_error: opts.lastError ?? null,
          sent_at: opts.status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', opts.existingLogId)
      return opts.existingLogId
    }

    const { data } = await service
      .from('webhook_logs')
      .insert({
        webhook_type: opts.type,
        payload: opts.payload,
        status: opts.status,
        attempts: 1,
        last_error: opts.lastError ?? null,
        sent_at: opts.status === 'sent' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    return data?.id ?? null
  } catch (err) {
    console.error('[snowflake] webhook_logs write failed:', err)
    return null
  }
}

async function httpPost(url: string, body: unknown): Promise<void> {
  const bearerToken = process.env.SNOWFLAKE_BEARER_TOKEN
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }
}

// ── Public push functions ────────────────────────────────────────────────────

export interface PushResult {
  success: boolean
  stubMode: boolean
  logId: string | null
  error?: string
}

export async function pushApprovalEvent(
  payload: SnowflakeApprovalPayload,
  existingLogId?: string
): Promise<PushResult> {
  const endpointUrl = process.env.SNOWFLAKE_ENDPOINT_URL

  if (isStubMode(endpointUrl)) {
    console.log(
      '[snowflake:stub] approval_event',
      payload.FACT_APPROVAL_EVENTS.APPROVAL_EVENT_ID,
      '→',
      payload.FACT_APPROVAL_EVENTS.ACTION,
      payload.FACT_SPEND_REQUESTS.REFERENCE_NO
    )
    const logId = await writeWebhookLog({
      type: 'snowflake_approval_event',
      payload,
      status: 'sent',
      existingLogId,
    })
    return { success: true, stubMode: true, logId }
  }

  try {
    await httpPost(endpointUrl!, payload)
    const logId = await writeWebhookLog({
      type: 'snowflake_approval_event',
      payload,
      status: 'sent',
      existingLogId,
    })
    return { success: true, stubMode: false, logId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[snowflake] approval_event push failed:', message)
    const logId = await writeWebhookLog({
      type: 'snowflake_approval_event',
      payload,
      status: 'failed',
      lastError: message,
      existingLogId,
    })
    return { success: false, stubMode: false, logId, error: message }
  }
}

export async function pushBudgetSync(
  payload: SnowflakeBudgetPayload,
  existingLogId?: string
): Promise<PushResult> {
  const endpointUrl = process.env.SNOWFLAKE_ENDPOINT_URL

  if (isStubMode(endpointUrl)) {
    console.log(
      `[snowflake:stub] budget_sync — ${payload.FACT_BUDGET_POSITIONS.length} positions @ ${payload.synced_at}`
    )
    const logId = await writeWebhookLog({
      type: 'snowflake_budget_sync',
      payload,
      status: 'sent',
      existingLogId,
    })
    return { success: true, stubMode: true, logId }
  }

  try {
    await httpPost(endpointUrl!, payload)
    const logId = await writeWebhookLog({
      type: 'snowflake_budget_sync',
      payload,
      status: 'sent',
      existingLogId,
    })
    return { success: true, stubMode: false, logId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[snowflake] budget_sync push failed:', message)
    const logId = await writeWebhookLog({
      type: 'snowflake_budget_sync',
      payload,
      status: 'failed',
      lastError: message,
      existingLogId,
    })
    return { success: false, stubMode: false, logId, error: message }
  }
}
