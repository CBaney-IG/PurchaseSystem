import { createClient } from '@/lib/supabase/server'

export interface AuditLogEntry {
  id: string
  request_id: string
  reference_no: string
  request_type: string
  actor_id: string
  actor_name: string
  action: string
  previous_status: string | null
  new_status: string | null
  comment: string | null
  created_at: string
}

export interface AuditLogFilters {
  dateFrom?: string
  dateTo?: string
  documentType?: string
  action?: string
  page?: number
  limit?: number
}

type RawEvent = {
  id: string
  request_id: string
  action: string
  previous_status: string | null
  new_status: string | null
  comment: string | null
  created_at: string
  approver: { id: string; full_name: string } | null
  request: { reference_no: string; type: string } | null
}

export async function getAuditLog(
  filters: AuditLogFilters = {}
): Promise<{ data: AuditLogEntry[]; count: number }> {
  const supabase = await createClient()
  const { dateFrom, dateTo, documentType, action, page = 1, limit = 50 } = filters

  let query = supabase
    .from('approval_events')
    .select(
      `id, request_id, action, previous_status, new_status, comment, created_at,
       approver:profiles!approver_id(id, full_name),
       request:spend_requests!request_id(reference_no, type)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
  if (action) query = query.eq('action', action)

  const { data, count, error } = await query
  if (error) return { data: [], count: 0 }

  const rows = ((data ?? []) as unknown as RawEvent[])
    .filter(e => !documentType || e.request?.type === documentType)
    .map(e => ({
      id: e.id,
      request_id: e.request_id,
      reference_no: e.request?.reference_no ?? '',
      request_type: e.request?.type ?? '',
      actor_id: e.approver?.id ?? '',
      actor_name: e.approver?.full_name ?? 'Unknown',
      action: e.action,
      previous_status: e.previous_status,
      new_status: e.new_status,
      comment: e.comment,
      created_at: e.created_at,
    }))

  return { data: rows, count: count ?? 0 }
}

export interface RequestForPDF {
  reference_no: string
  type: string
  title: string
  description: string | null
  justification: string | null
  amount: number
  currency: string
  category: string
  priority: string
  status: string
  vendor_name: string | null
  project_code: string | null
  required_by: string | null
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  budget_flag: boolean
  requester_name: string
  cost_centre_code: string
  cost_centre_name: string
  budget_amount: number | null
  budget_committed: number | null
  events: Array<{
    id: string
    action: string
    actor_name: string
    previous_status: string | null
    new_status: string | null
    comment: string | null
    created_at: string
    level: number
  }>
}

export async function getRequestForPDF(requestId: string): Promise<RequestForPDF | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('spend_requests')
    .select(`
      id, reference_no, type, title, description, justification,
      amount, currency, category, priority, status,
      vendor_name, project_code, required_by,
      created_at, submitted_at, approved_at, budget_flag,
      cost_centre_id,
      requester:profiles!requester_id(full_name),
      cost_centre:cost_centres!cost_centre_id(code, name),
      approval_events(
        id, action, previous_status, new_status, comment, created_at, level,
        approver:profiles!approver_id(full_name)
      )
    `)
    .eq('id', requestId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  type Raw = {
    id: string
    reference_no: string
    type: string
    title: string
    description: string | null
    justification: string | null
    amount: number
    currency: string
    category: string
    priority: string
    status: string
    vendor_name: string | null
    project_code: string | null
    required_by: string | null
    created_at: string
    submitted_at: string | null
    approved_at: string | null
    budget_flag: boolean
    cost_centre_id: string
    requester: { full_name: string } | null
    cost_centre: { code: string; name: string } | null
    approval_events: Array<{
      id: string
      action: string
      previous_status: string | null
      new_status: string | null
      comment: string | null
      created_at: string
      level: number
      approver: { full_name: string } | null
    }>
  }
  const r = data as unknown as Raw

  const year = new Date().getFullYear()
  const { data: budget } = await supabase
    .from('budgets')
    .select('amount, committed')
    .eq('cost_centre_id', r.cost_centre_id)
    .eq('category', r.category)
    .eq('period_year', year)
    .is('period_month', null)
    .maybeSingle()

  return {
    reference_no: r.reference_no,
    type: r.type,
    title: r.title,
    description: r.description,
    justification: r.justification,
    amount: Number(r.amount),
    currency: r.currency,
    category: r.category,
    priority: r.priority,
    status: r.status,
    vendor_name: r.vendor_name,
    project_code: r.project_code,
    required_by: r.required_by,
    created_at: r.created_at,
    submitted_at: r.submitted_at,
    approved_at: r.approved_at,
    budget_flag: r.budget_flag,
    requester_name: r.requester?.full_name ?? 'Unknown',
    cost_centre_code: r.cost_centre?.code ?? '',
    cost_centre_name: r.cost_centre?.name ?? '',
    budget_amount: budget ? Number(budget.amount) : null,
    budget_committed: budget ? Number(budget.committed) : null,
    events: (r.approval_events ?? [])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(e => ({
        id: e.id,
        action: e.action,
        actor_name: e.approver?.full_name ?? 'Unknown',
        previous_status: e.previous_status,
        new_status: e.new_status,
        comment: e.comment,
        created_at: e.created_at,
        level: e.level,
      })),
  }
}
