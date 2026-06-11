import { createClient } from '@/lib/supabase/server'
import type { UserRole, SpendRequest } from '@/types/domain'

const APPROVER_PENDING_MAP: Partial<Record<UserRole, string[]>> = {
  approver_l1: ['pending_l1'],
  approver_l2: ['pending_l2'],
  approver_l3: ['pending_l3'],
}

const ADMIN_ROLES: UserRole[] = ['admin', 'group_admin', 'procurement_officer', 'finance']

const MY_ACTIVE_STATUSES = ['submitted', 'pending_l1', 'pending_l2', 'pending_l3', 'pending_info']

export interface DashboardMetrics {
  myPendingCount: number
  pendingMyApprovalCount: number
  entityBudgetUtilisationPct: number | null
  ytdActuals: number
  ytdBudget: number
}

export interface OverBudgetCostCentre {
  id: string
  code: string
  name: string
  utilisationPct: number
  committed: number
  amount: number
  category: string
}

export async function getDashboardMetrics(
  userId: string,
  role: UserRole,
  year: number
): Promise<DashboardMetrics> {
  const supabase = await createClient()

  const isAdmin = ADMIN_ROLES.includes(role)
  const approvalStatuses: string[] = isAdmin
    ? ['pending_l1', 'pending_l2', 'pending_l3']
    : (APPROVER_PENDING_MAP[role] ?? [])

  // Run my-pending and budget queries in parallel
  const [myPendingResult, budgetResult] = await Promise.all([
    supabase
      .from('spend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', userId)
      .in('status', MY_ACTIVE_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('budgets')
      .select('amount, committed, actuals')
      .eq('period_year', year)
      .is('period_month', null),
  ])

  // Pending approval count — only query if this role has an inbox
  let pendingMyApprovalCount = 0
  if (approvalStatuses.length > 0) {
    const { count } = await supabase
      .from('spend_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', approvalStatuses)
      .is('deleted_at', null)
    pendingMyApprovalCount = count ?? 0
  }

  const budgets = budgetResult.data ?? []
  let entityBudgetUtilisationPct: number | null = null
  let ytdActuals = 0
  let ytdBudget = 0

  if (budgets.length > 0) {
    const totalAmount = budgets.reduce((sum, b) => sum + (b.amount as number), 0)
    const totalCommitted = budgets.reduce((sum, b) => sum + (b.committed as number), 0)
    ytdActuals = budgets.reduce((sum, b) => sum + (b.actuals as number), 0)
    ytdBudget = totalAmount
    entityBudgetUtilisationPct = totalAmount > 0 ? (totalCommitted / totalAmount) * 100 : null
  }

  return {
    myPendingCount: myPendingResult.count ?? 0,
    pendingMyApprovalCount,
    entityBudgetUtilisationPct,
    ytdActuals,
    ytdBudget,
  }
}

type BudgetWithCostCentre = {
  amount: number
  committed: number
  category: string
  cost_centre: { id: string; code: string; name: string } | null
}

export async function getOverBudgetCostCentres(year: number): Promise<OverBudgetCostCentre[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('budgets')
    .select('amount, committed, category, cost_centre:cost_centres!cost_centre_id(id, code, name)')
    .eq('period_year', year)
    .is('period_month', null)
    .gt('amount', 0)

  const budgets = (data ?? []) as unknown as BudgetWithCostCentre[]
  if (budgets.length === 0) return []

  const results: OverBudgetCostCentre[] = []

  for (const b of budgets) {
    const amount = b.amount
    const committed = b.committed
    const utilisationPct = (committed / amount) * 100

    if (utilisationPct >= 90) {
      const cc = b.cost_centre
      if (cc) {
        results.push({
          id: cc.id,
          code: cc.code,
          name: cc.name,
          utilisationPct,
          committed,
          amount,
          category: b.category as string,
        })
      }
    }
  }

  return results.sort((a, b) => b.utilisationPct - a.utilisationPct)
}

export async function getMyRecentRequests(
  userId: string,
  limit = 10
): Promise<SpendRequest[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('spend_requests')
    .select('*')
    .eq('requester_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as SpendRequest[]
}
