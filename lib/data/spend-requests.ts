import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateRefNumber } from '@/lib/ref-number'
import type { SpendRequest, SpendRequestType, SpendRequestAttachment } from '@/types/domain'
import { updateCommitted } from '@/lib/data/budgets'
import { sendBudgetWarning } from '@/lib/notifications/send'

// ---- Types ----

export interface CreateDraftParams {
  entity_id: string
  type: SpendRequestType
  requester_id: string
  cost_centre_id: string
  project_code?: string | null
  vendor_id?: string | null
  vendor_name?: string | null
  category: string
  title: string
  description?: string | null
  amount: number
  currency?: string
  priority?: 'normal' | 'urgent'
  required_by?: string | null
  justification?: string | null
}

export interface UpdateDraftParams {
  cost_centre_id?: string
  project_code?: string | null
  vendor_id?: string | null
  vendor_name?: string | null
  category?: string
  title?: string
  description?: string | null
  amount?: number
  priority?: 'normal' | 'urgent'
  required_by?: string | null
  justification?: string | null
}

export interface BudgetPosition {
  budget_amount: number
  committed: number
  actuals: number
  available: number
  utilisation_pct: number
}

// ---- READ functions (session client — RLS enforced) ----

export async function listMyRequests(opts: {
  type?: SpendRequestType
  status?: string
  page?: number
  limit?: number
} = {}): Promise<{ data: SpendRequest[]; count: number }> {
  const supabase = await createClient()
  const limit = opts.limit ?? 20
  const offset = ((opts.page ?? 1) - 1) * limit

  let query = supabase
    .from('spend_requests')
    .select(
      '*, cost_centre:cost_centres!cost_centre_id(id, code, name), vendor:vendors!vendor_id(id, name)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.type) query = query.eq('type', opts.type)
  if (opts.status) query = query.eq('status', opts.status)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { data: (data ?? []) as SpendRequest[], count: count ?? 0 }
}

export async function getRequest(id: string): Promise<SpendRequest | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spend_requests')
    .select(`
      *,
      cost_centre:cost_centres!cost_centre_id(id, code, name),
      vendor:vendors!vendor_id(id, name),
      requester:profiles!requester_id(id, full_name, email, role),
      approval_events(
        *,
        approver:profiles!approver_id(id, full_name)
      ),
      attachments:spend_request_attachments(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  if (!data) return null

  const result = data as Record<string, unknown>
  if (Array.isArray(result.approval_events)) {
    result.approval_events = [...result.approval_events].sort(
      (a: Record<string, string>, b: Record<string, string>) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  return result as unknown as SpendRequest
}

export async function getBudgetPosition(
  costCentreId: string,
  category: string,
  year: number
): Promise<BudgetPosition | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budgets')
    .select('amount, committed, actuals')
    .eq('cost_centre_id', costCentreId)
    .eq('category', category)
    .eq('period_year', year)
    .is('period_month', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const available = (data.amount as number) - (data.committed as number)
  const utilisation_pct =
    (data.amount as number) > 0
      ? ((data.committed as number) / (data.amount as number)) * 100
      : 0

  return {
    budget_amount: data.amount as number,
    committed: data.committed as number,
    actuals: data.actuals as number,
    available,
    utilisation_pct,
  }
}

// ---- WRITE functions (service client — bypasses RLS) ----

export async function createDraft(params: CreateDraftParams): Promise<SpendRequest> {
  const service = createServiceClient()
  const id = randomUUID()

  const { data, error } = await service
    .from('spend_requests')
    .insert({
      id,
      entity_id: params.entity_id,
      type: params.type,
      requester_id: params.requester_id,
      cost_centre_id: params.cost_centre_id,
      project_code: params.project_code ?? null,
      vendor_id: params.vendor_id ?? null,
      vendor_name: params.vendor_name ?? null,
      category: params.category,
      title: params.title,
      description: params.description ?? null,
      amount: params.amount,
      currency: params.currency ?? 'ZAR',
      priority: params.priority ?? 'normal',
      required_by: params.required_by ?? null,
      justification: params.justification ?? null,
      reference_no: `DRAFT-${id}`,
      status: 'draft',
      current_level: 1,
      budget_flag: false,
      duplicate_flag: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SpendRequest
}

export async function updateDraft(id: string, params: UpdateDraftParams): Promise<SpendRequest> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('spend_requests')
    .update(params)
    .eq('id', id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SpendRequest
}

export async function submitRequest(id: string, requesterId: string): Promise<SpendRequest> {
  const service = createServiceClient()

  const { data: request, error: fetchErr } = await service
    .from('spend_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'draft')
    .single()

  if (fetchErr || !request) throw new Error('Request not found or not in draft status')

  const year = new Date().getFullYear()

  // Budget check
  const { data: budget } = await service
    .from('budgets')
    .select('amount, committed')
    .eq('cost_centre_id', request.cost_centre_id)
    .eq('category', request.category)
    .eq('period_year', year)
    .is('period_month', null)
    .maybeSingle()

  const budget_flag = budget
    ? (budget.committed as number) + (request.amount as number) > (budget.amount as number)
    : false

  // Duplicate check: same requester + category + non-terminal status in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: dupCount } = await service
    .from('spend_requests')
    .select('*', { count: 'exact', head: true })
    .eq('requester_id', requesterId)
    .eq('category', request.category)
    .neq('id', id)
    .neq('status', 'cancelled')
    .neq('status', 'rejected')
    .neq('status', 'draft')
    .gte('created_at', thirtyDaysAgo)

  const duplicate_flag = (dupCount ?? 0) > 0

  const reference_no = await generateRefNumber(request.type as SpendRequestType, service, year)

  const { data: updated, error: updateErr } = await service
    .from('spend_requests')
    .update({
      reference_no,
      status: 'pending_l1',
      submitted_at: new Date().toISOString(),
      budget_flag,
      duplicate_flag,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) throw new Error(updateErr.message)

  const { error: eventErr } = await service
    .from('approval_events')
    .insert({
      request_id: id,
      approver_id: requesterId,
      level: 1,
      action: 'submitted',
      previous_status: 'draft',
      new_status: 'pending_l1',
    })

  if (eventErr) throw new Error(eventErr.message)

  // Increment committed spend — fire-and-forget, must not abort submission
  trackBudgetIncrement(service, {
    costCentreId: request.cost_centre_id as string,
    category: request.category as string,
    amount: request.amount as number,
    year,
  }).catch((err) => console.error('[budget] increment failed:', err))

  return updated as SpendRequest
}

export async function cancelRequest(id: string): Promise<void> {
  const service = createServiceClient()

  // Fetch current state so we know whether to decrement committed
  const { data: existing } = await service
    .from('spend_requests')
    .select('status, amount, cost_centre_id, category')
    .eq('id', id)
    .single()

  const { error } = await service
    .from('spend_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .in('status', ['draft', 'pending_l1'])

  if (error) throw new Error(error.message)

  // Decrement committed if the request had been submitted (not just a draft)
  if (existing && existing.status === 'pending_l1') {
    const year = new Date().getFullYear()
    updateCommitted({
      costCentreId: existing.cost_centre_id as string,
      category: existing.category as string,
      year,
      delta: -(existing.amount as number),
    }).catch((err) => console.error('[budget] cancel decrement failed:', err))
  }
}

// ---- Budget tracking helpers ----

async function trackBudgetIncrement(
  service: ReturnType<typeof createServiceClient>,
  params: { costCentreId: string; category: string; amount: number; year: number }
): Promise<void> {
  const result = await updateCommitted({
    costCentreId: params.costCentreId,
    category: params.category,
    year: params.year,
    delta: params.amount,
  })
  if (!result?.isNearLimit) return

  // 90% or over — fetch cost centre details and dispatch alert
  const { data: costCentre } = await service
    .from('cost_centres')
    .select('name, code, budget_owner_id, entity_id')
    .eq('id', params.costCentreId)
    .single()

  if (!costCentre) return

  const recipients: { email: string; full_name: string }[] = []

  const { data: financeUsers } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('entity_id', costCentre.entity_id as string)
    .eq('role', 'finance')
    .eq('active', true)

  if (financeUsers) {
    recipients.push(
      ...financeUsers.map((u) => ({ email: u.email as string, full_name: u.full_name as string }))
    )
  }

  if (costCentre.budget_owner_id) {
    const { data: owner } = await service
      .from('profiles')
      .select('email, full_name')
      .eq('id', costCentre.budget_owner_id as string)
      .single()
    if (owner) {
      const ownerEmail = owner.email as string
      if (!recipients.find((r) => r.email === ownerEmail)) {
        recipients.push({ email: ownerEmail, full_name: owner.full_name as string })
      }
    }
  }

  await sendBudgetWarning({
    costCentreName: costCentre.name as string,
    costCentreCode: costCentre.code as string,
    category: params.category,
    budgetAmount: result.budgetAmount,
    committed: result.newCommitted,
    available: result.budgetAmount - result.newCommitted,
    utilisationPct: result.utilisationPct,
    currency: 'ZAR',
    year: params.year,
    recipients,
  })
}

export async function uploadAttachment(
  requestId: string,
  entityId: string,
  uploadedById: string,
  file: { name: string; buffer: ArrayBuffer; type: string; size: number }
): Promise<SpendRequestAttachment> {
  const service = createServiceClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${entityId}/${requestId}/${Date.now()}-${safeName}`

  const { error: storageError } = await service.storage
    .from('attachments')
    .upload(storagePath, file.buffer, { contentType: file.type })

  if (storageError) throw new Error(storageError.message)

  const { data, error } = await service
    .from('spend_request_attachments')
    .insert({
      request_id: requestId,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type,
      file_size_bytes: file.size,
      uploaded_by: uploadedById,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SpendRequestAttachment
}
