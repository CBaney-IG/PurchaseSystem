/**
 * Snowflake payload transformation
 *
 * Converts USMP database rows into the agreed Snowflake target schema.
 * Shape is finalised with the Data team — update column names here once
 * the actual endpoint spec is provided.
 *
 * Tables populated:
 *   FACT_APPROVAL_EVENTS  — one row per approval action
 *   FACT_SPEND_REQUESTS   — current state of a spend request
 *   FACT_BUDGET_POSITIONS — point-in-time budget snapshot (budget sync only)
 */

// ── Types from Supabase DB rows ──────────────────────────────────────────────

export interface ApprovalEventRow {
  id: string
  request_id: string
  approver_id: string
  level: number
  action: string
  comment: string | null
  previous_status: string | null
  new_status: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SpendRequestRow {
  id: string
  entity_id: string
  type: string
  reference_no: string
  requester_id: string
  cost_centre_id: string
  project_code: string | null
  vendor_id: string | null
  vendor_name: string | null
  category: string
  title: string
  amount: number
  currency: string
  status: string
  current_level: number
  priority: string
  required_by: string | null
  budget_flag: boolean
  submitted_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface BudgetRow {
  cost_centre_id: string
  entity_id: string
  cost_centre_code: string
  cost_centre_name: string
  category: string
  period_year: number
  period_month: number | null
  amount: number
  committed: number
  actuals: number
  currency: string
}

// ── Snowflake target schemas ─────────────────────────────────────────────────

export interface SnowflakeApprovalEventFact {
  APPROVAL_EVENT_ID: string
  REQUEST_ID: string
  REFERENCE_NO: string
  APPROVER_ID: string
  ENTITY_ID: string
  LEVEL: number
  ACTION: string
  PREVIOUS_STATUS: string | null
  NEW_STATUS: string | null
  COMMENT: string | null
  EVENT_TIMESTAMP_UTC: string
  METADATA: Record<string, unknown> | null
}

export interface SnowflakeSpendRequestFact {
  REQUEST_ID: string
  REFERENCE_NO: string
  ENTITY_ID: string
  TYPE: string
  STATUS: string
  REQUESTER_ID: string
  COST_CENTRE_ID: string
  PROJECT_CODE: string | null
  VENDOR_ID: string | null
  VENDOR_NAME: string | null
  CATEGORY: string
  AMOUNT: number
  CURRENCY: string
  PRIORITY: string
  BUDGET_FLAG: boolean
  SUBMITTED_AT: string | null
  APPROVED_AT: string | null
  UPDATED_AT: string
}

export interface SnowflakeBudgetPositionFact {
  COST_CENTRE_ID: string
  ENTITY_ID: string
  COST_CENTRE_CODE: string
  COST_CENTRE_NAME: string
  CATEGORY: string
  PERIOD_YEAR: number
  PERIOD_MONTH: number | null
  BUDGET_AMOUNT: number
  COMMITTED_AMOUNT: number
  ACTUALS_AMOUNT: number
  AVAILABLE_AMOUNT: number
  UTILISATION_PCT: number
  CURRENCY: string
}

// ── Combined payloads sent to the Snowflake endpoint ────────────────────────

export interface SnowflakeApprovalPayload {
  event: 'approval_action'
  source: 'usmp'
  FACT_APPROVAL_EVENTS: SnowflakeApprovalEventFact
  FACT_SPEND_REQUESTS: SnowflakeSpendRequestFact
}

export interface SnowflakeBudgetPayload {
  event: 'budget_sync'
  source: 'usmp'
  synced_at: string
  FACT_BUDGET_POSITIONS: SnowflakeBudgetPositionFact[]
}

// ── Transform functions ──────────────────────────────────────────────────────

export function transformApprovalEvent(
  event: ApprovalEventRow,
  request: SpendRequestRow
): SnowflakeApprovalPayload {
  return {
    event: 'approval_action',
    source: 'usmp',
    FACT_APPROVAL_EVENTS: {
      APPROVAL_EVENT_ID: event.id,
      REQUEST_ID: event.request_id,
      REFERENCE_NO: request.reference_no,
      APPROVER_ID: event.approver_id,
      ENTITY_ID: request.entity_id,
      LEVEL: event.level,
      ACTION: event.action,
      PREVIOUS_STATUS: event.previous_status,
      NEW_STATUS: event.new_status,
      COMMENT: event.comment,
      EVENT_TIMESTAMP_UTC: event.created_at,
      METADATA: event.metadata,
    },
    FACT_SPEND_REQUESTS: {
      REQUEST_ID: request.id,
      REFERENCE_NO: request.reference_no,
      ENTITY_ID: request.entity_id,
      TYPE: request.type,
      STATUS: request.status,
      REQUESTER_ID: request.requester_id,
      COST_CENTRE_ID: request.cost_centre_id,
      PROJECT_CODE: request.project_code,
      VENDOR_ID: request.vendor_id,
      VENDOR_NAME: request.vendor_name,
      CATEGORY: request.category,
      AMOUNT: Number(request.amount),
      CURRENCY: request.currency,
      PRIORITY: request.priority,
      BUDGET_FLAG: request.budget_flag,
      SUBMITTED_AT: request.submitted_at,
      APPROVED_AT: request.approved_at,
      UPDATED_AT: request.updated_at,
    },
  }
}

export function transformBudgetPositions(
  rows: BudgetRow[],
  syncedAt: string
): SnowflakeBudgetPayload {
  return {
    event: 'budget_sync',
    source: 'usmp',
    synced_at: syncedAt,
    FACT_BUDGET_POSITIONS: rows.map(r => {
      const available = Math.max(0, Number(r.amount) - Number(r.committed))
      const utilisationPct =
        Number(r.amount) > 0
          ? Math.round((Number(r.committed) / Number(r.amount)) * 10000) / 100
          : 0
      return {
        COST_CENTRE_ID: r.cost_centre_id,
        ENTITY_ID: r.entity_id,
        COST_CENTRE_CODE: r.cost_centre_code,
        COST_CENTRE_NAME: r.cost_centre_name,
        CATEGORY: r.category,
        PERIOD_YEAR: r.period_year,
        PERIOD_MONTH: r.period_month,
        BUDGET_AMOUNT: Number(r.amount),
        COMMITTED_AMOUNT: Number(r.committed),
        ACTUALS_AMOUNT: Number(r.actuals),
        AVAILABLE_AMOUNT: available,
        UTILISATION_PCT: utilisationPct,
        CURRENCY: r.currency,
      }
    }),
  }
}
