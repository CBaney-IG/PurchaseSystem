import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { transformBudgetPositions } from '@/lib/snowflake/transform'
import { pushBudgetSync } from '@/lib/snowflake/push'
import { retryFailedWebhooks } from '@/lib/snowflake/retry'
import type { BudgetRow } from '@/lib/snowflake/transform'

const ADMIN_ROLES = ['admin', 'group_admin']

/**
 * GET /api/webhooks/snowflake-budget-sync
 *
 * Pushes current budget positions to Snowflake and retries failed webhooks.
 *
 * In production this is called by a Supabase Edge Function on a 15-min cron
 * (supabase/functions/snowflake-budget-sync/index.ts — to be deployed once the
 * Snowflake endpoint URL is confirmed with the Data team).
 *
 * For local dev and manual testing, call this endpoint:
 *   - As an authenticated admin/group_admin in the browser
 *   - Via curl: curl -H "x-webhook-secret: $SECRET" https://localhost:3003/api/webhooks/snowflake-budget-sync
 *
 * Two auth paths:
 *   1. Session cookie (admin/group_admin role)
 *   2. x-webhook-secret header (for Edge Function / cron)
 */
export async function GET(request: NextRequest) {
  const secretHeader = request.headers.get('x-webhook-secret')
  const validSecret =
    secretHeader &&
    process.env.SNOWFLAKE_WEBHOOK_SECRET &&
    secretHeader === process.env.SNOWFLAKE_WEBHOOK_SECRET

  if (!validSecret) {
    // Fall back to session auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const syncedAt = new Date().toISOString()
  const service = createServiceClient()

  // Fetch active budget rows joined with cost_centre and entity info
  const { data: rawBudgets, error } = await service
    .from('budgets')
    .select(`
      cost_centre_id,
      category,
      period_year,
      period_month,
      amount,
      committed,
      actuals,
      currency,
      cost_centre:cost_centres!cost_centre_id(
        code, name, entity_id
      )
    `)
    .gt('amount', 0)

  if (error) {
    console.error('[snowflake-budget-sync] failed to fetch budgets:', error.message)
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  type RawBudget = {
    cost_centre_id: string
    category: string
    period_year: number
    period_month: number | null
    amount: number
    committed: number
    actuals: number
    currency: string
    cost_centre: { code: string; name: string; entity_id: string } | null
  }

  const budgetRows: BudgetRow[] = ((rawBudgets ?? []) as unknown as RawBudget[])
    .filter(b => b.cost_centre !== null)
    .map(b => ({
      cost_centre_id: b.cost_centre_id,
      entity_id: b.cost_centre!.entity_id,
      cost_centre_code: b.cost_centre!.code,
      cost_centre_name: b.cost_centre!.name,
      category: b.category,
      period_year: b.period_year,
      period_month: b.period_month,
      amount: Number(b.amount),
      committed: Number(b.committed),
      actuals: Number(b.actuals),
      currency: b.currency,
    }))

  const payload = transformBudgetPositions(budgetRows, syncedAt)
  const pushResult = await pushBudgetSync(payload)

  // Run retry pass for any failed approval events too
  const retryResult = await retryFailedWebhooks()

  return Response.json({
    budgetSync: {
      positions: budgetRows.length,
      success: pushResult.success,
      stubMode: pushResult.stubMode,
      error: pushResult.error,
    },
    retry: retryResult,
    syncedAt,
  })
}
