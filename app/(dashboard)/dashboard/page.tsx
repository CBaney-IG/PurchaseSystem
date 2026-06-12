import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCards } from '@/components/dashboard/MetricCards'
import { MetricCardsSkeleton } from '@/components/dashboard/MetricCardsSkeleton'
import { BudgetAlertBanner } from '@/components/dashboard/BudgetAlertBanner'
import { RecentRequestsWidget } from '@/components/dashboard/RecentRequestsWidget'
import { ApprovalInbox } from '@/components/approvals/ApprovalInbox'
import type { UserRole } from '@/types/domain'

const APPROVER_ROLES = [
  'approver_l1',
  'approver_l2',
  'approver_l3',
  'procurement_officer',
  'finance',
  'admin',
  'group_admin',
]

const BUDGET_ALERT_ROLES = ['finance', 'admin', 'group_admin']

function timeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function RecentRequestsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3" />
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, entity_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const year = new Date().getFullYear()
  const role = profile.role as UserRole
  const isApprover = APPROVER_ROLES.includes(role)
  const showBudgetAlert = BUDGET_ALERT_ROLES.includes(role)

  const firstName = (profile.full_name as string | null)?.split(' ')[0]
    ?? user.email?.split('@')[0]
    ?? 'there'

  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header row */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Good {timeOfDay()}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{today}</p>
          </div>

          {/* Quick-action buttons */}
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href="/expenses/new">
                <FileText className="mr-1.5 h-4 w-4" />
                New expense
              </Link>
            </Button>
            <Button asChild size="sm" className="flex-1 sm:flex-none">
              <Link href="/requests/new">
                <Plus className="mr-1.5 h-4 w-4" />
                New request
              </Link>
            </Button>
          </div>
        </div>

        {/* Budget alert banner — finance / admin / group_admin only */}
        {showBudgetAlert && (
          <div className="mb-6">
            <Suspense fallback={null}>
              <BudgetAlertBanner year={year} />
            </Suspense>
          </div>
        )}

        {/* Metric cards */}
        <div className="mb-8">
          <Suspense fallback={<MetricCardsSkeleton />}>
            <MetricCards userId={profile.id as string} role={role} year={year} />
          </Suspense>
        </div>

        {/* Role-based main content */}
        {isApprover ? (
          <section aria-label="Pending approvals">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Pending approvals</h2>
              <Link
                href="/approvals"
                className="text-sm font-medium text-slate-500 underline hover:text-slate-900"
              >
                View all
              </Link>
            </div>
            <ApprovalInbox />
          </section>
        ) : (
          <section aria-label="Recent requests">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent requests</h2>
              <Link
                href="/requests"
                className="text-sm font-medium text-slate-500 underline hover:text-slate-900"
              >
                View all
              </Link>
            </div>
            <Suspense fallback={<RecentRequestsSkeleton />}>
              <RecentRequestsWidget userId={profile.id as string} />
            </Suspense>
          </section>
        )}
      </div>
    </div>
  )
}
