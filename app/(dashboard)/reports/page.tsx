import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuditLog } from '@/lib/data/reports'
import { AuditLogFilters } from '@/components/reports/AuditLogFilters'
import { formatDate } from '@/lib/utils'

const PRIVILEGED_ROLES = ['admin', 'group_admin', 'procurement_officer', 'finance']

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  delegated: 'Delegated',
  info_requested: 'Info requested',
  info_provided: 'Info provided',
  escalated: 'Escalated',
  cancelled: 'Cancelled',
}

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-50 text-blue-700',
  pending_l1: 'bg-amber-50 text-amber-700',
  pending_l2: 'bg-amber-50 text-amber-700',
  pending_l3: 'bg-amber-50 text-amber-700',
  pending_info: 'bg-purple-50 text-purple-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  converted: 'bg-teal-50 text-teal-700',
}

function StatusBadge({ status }: { status: string }) {
  const colour = STATUS_COLOURS[status] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colour}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

type SearchParams = Promise<{
  dateFrom?: string
  dateTo?: string
  documentType?: string
  action?: string
  page?: string
}>

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  if (!PRIVILEGED_ROLES.includes(profile.role)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const LIMIT = 50

  const { data: entries, count } = await getAuditLog({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    documentType: params.documentType,
    action: params.action,
    page,
    limit: LIMIT,
  })

  const totalPages = Math.ceil((count ?? 0) / LIMIT)
  const canExportCsv = PRIVILEGED_ROLES.includes(profile.role)

  function pageHref(p: number) {
    const qs = new URLSearchParams()
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
    if (params.dateTo) qs.set('dateTo', params.dateTo)
    if (params.documentType) qs.set('documentType', params.documentType)
    if (params.action) qs.set('action', params.action)
    if (p > 1) qs.set('page', String(p))
    const str = qs.toString()
    return `/reports${str ? `?${str}` : ''}`
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            All document approval events — immutable record.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <Suspense>
            <AuditLogFilters canExportCsv={canExportCsv} />
          </Suspense>
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center">
            <p className="text-sm text-slate-400">No audit events match the current filters.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Status change</th>
                    <th className="px-4 py-3">Timestamp (UTC)</th>
                    <th className="px-4 py-3 text-right">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <a
                          href={`/requests/${e.request_id}`}
                          className="font-mono text-xs text-slate-700 hover:text-slate-900 hover:underline"
                        >
                          {e.reference_no || '—'}
                        </a>
                        {e.request_type && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {e.request_type === 'purchase_request' ? 'PR' : 'Expense'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{e.actor_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-slate-800">
                          {ACTION_LABELS[e.action] ?? e.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.previous_status && e.new_status ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <StatusBadge status={e.previous_status} />
                            <span className="text-slate-300">→</span>
                            <StatusBadge status={e.new_status} />
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(e.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right max-w-xs">
                        {e.comment ? (
                          <span
                            className="text-xs text-slate-500 truncate block text-right"
                            title={e.comment}
                          >
                            {e.comment.length > 60
                              ? e.comment.slice(0, 60) + '…'
                              : e.comment}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages} ({count} events)
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <a
                      href={pageHref(page - 1)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Previous
                    </a>
                  )}
                  {page < totalPages && (
                    <a
                      href={pageHref(page + 1)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Next
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
