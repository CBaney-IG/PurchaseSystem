import { createServiceClient } from '@/lib/supabase/service'
import { pushApprovalEvent, pushBudgetSync } from './push'
import type { SnowflakeApprovalPayload, SnowflakeBudgetPayload } from './transform'

const MAX_ATTEMPTS = 3

export interface RetryResult {
  processed: number
  succeeded: number
  abandoned: number
  errors: string[]
}

/**
 * Re-attempt all failed webhook_logs entries that have fewer than MAX_ATTEMPTS.
 * After MAX_ATTEMPTS failures: mark abandoned, alert group_admin via console
 * (email alert is wired in F-016 or manually).
 *
 * Called by:
 *  - /api/webhooks/snowflake-retry (manually for local dev)
 *  - Supabase Edge Function cron (production — see supabase/functions/snowflake-retry/)
 */
export async function retryFailedWebhooks(): Promise<RetryResult> {
  const service = createServiceClient()
  const result: RetryResult = { processed: 0, succeeded: 0, abandoned: 0, errors: [] }

  const { data: failed } = await service
    .from('webhook_logs')
    .select('id, webhook_type, payload, attempts')
    .eq('status', 'failed')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(50)

  if (!failed || failed.length === 0) return result

  for (const row of failed) {
    result.processed++

    // Increment attempts before trying so a crash during push still counts
    await service
      .from('webhook_logs')
      .update({ attempts: (row.attempts as number) + 1 })
      .eq('id', row.id as string)

    let pushResult
    if (row.webhook_type === 'snowflake_approval_event') {
      pushResult = await pushApprovalEvent(
        row.payload as SnowflakeApprovalPayload,
        row.id as string
      )
    } else if (row.webhook_type === 'snowflake_budget_sync') {
      pushResult = await pushBudgetSync(
        row.payload as SnowflakeBudgetPayload,
        row.id as string
      )
    } else {
      result.errors.push(`Unknown webhook_type: ${row.webhook_type}`)
      continue
    }

    if (pushResult.success) {
      result.succeeded++
    } else {
      result.errors.push(`${row.id}: ${pushResult.error}`)

      // If we've now hit MAX_ATTEMPTS, mark abandoned
      const updatedAttempts = (row.attempts as number) + 1
      if (updatedAttempts >= MAX_ATTEMPTS) {
        await service
          .from('webhook_logs')
          .update({ status: 'abandoned' })
          .eq('id', row.id as string)

        result.abandoned++
        console.error(
          `[snowflake:retry] ABANDONED log ${row.id} after ${updatedAttempts} attempts.` +
          ' Alert: group_admin should investigate via Admin > Webhook Logs.'
        )
      }
    }
  }

  return result
}
