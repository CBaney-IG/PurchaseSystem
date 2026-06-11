import Link from 'next/link'
import { getMyRecentRequests } from '@/lib/data/dashboard'
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SpendRequest } from '@/types/domain'

interface RecentRequestsWidgetProps {
  userId: string
}

export async function RecentRequestsWidget({ userId }: RecentRequestsWidgetProps) {
  const requests = await getMyRecentRequests(userId, 10)

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
        <p className="text-sm font-medium text-slate-500">No requests yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Your submitted requests will appear here.
        </p>
      </div>
    )
  }

  return (
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
            <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </th>
            <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 lg:table-cell">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((req: SpendRequest) => (
            <tr key={req.id} className="transition-colors hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/requests/${req.id}`}
                  className="font-mono text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  {req.reference_no.startsWith('DRAFT-') ? 'DRAFT' : req.reference_no}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/requests/${req.id}`}
                  className="line-clamp-1 font-medium text-slate-800 hover:text-slate-900"
                >
                  {req.title}
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-right font-medium text-slate-700 md:table-cell">
                {formatCurrency(req.amount, req.currency)}
              </td>
              <td className="px-4 py-3">
                <RequestStatusBadge status={req.status} />
              </td>
              <td className="hidden px-4 py-3 text-right text-slate-400 lg:table-cell">
                {req.submitted_at ? formatDate(req.submitted_at) : formatDate(req.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
