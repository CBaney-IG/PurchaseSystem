import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listMyRequests } from '@/lib/data/spend-requests'
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SpendRequest } from '@/types/domain'

export default async function MyRequestsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: requests, count } = await listMyRequests({ limit: 50 })

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My requests</h1>
            <p className="mt-1 text-sm text-slate-500">
              {count === 0 ? 'No requests yet' : `${count} request${count === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button asChild>
            <Link href="/requests/new">
              <Plus className="mr-2 h-4 w-4" />
              New request
            </Link>
          </Button>
        </div>

        {/* Table */}
        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">No requests yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Submit your first purchase request to get started.
            </p>
            <Button asChild className="mt-4" variant="outline" size="sm">
              <Link href="/requests/new">
                <Plus className="mr-2 h-3.5 w-3.5" />
                New purchase request
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Title
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell">
                    Category
                  </th>
                  <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 lg:table-cell">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 lg:table-cell">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req: SpendRequest) => (
                  <tr
                    key={req.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-mono text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        {req.reference_no.startsWith('DRAFT-')
                          ? 'DRAFT'
                          : req.reference_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-medium text-slate-800 hover:text-slate-900"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {req.category}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-medium text-slate-700 lg:table-cell">
                      {formatCurrency(req.amount, req.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">
                      {req.submitted_at ? formatDate(req.submitted_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
