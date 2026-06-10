import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, Paperclip, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRequest } from '@/lib/data/spend-requests'
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge'
import { RequestDetailActions } from './RequestDetailActions'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ApprovalEvent } from '@/types/domain'

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  delegated: 'Delegated',
  info_requested: 'More information requested',
  info_provided: 'Information provided',
  escalated: 'Escalated',
  cancelled: 'Cancelled',
}

type Params = Promise<{ id: string }>

export default async function RequestDetailPage({ params }: { params: Params }) {
  const { id } = await params

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

  const request = await getRequest(id)
  if (!request) notFound()

  const isRequester = request.requester_id === profile.id
  const canCancel =
    isRequester && ['draft', 'pending_l1'].includes(request.status)

  const events = (request.approval_events ?? []) as ApprovalEvent[]
  const attachments = request.attachments ?? []

  const displayRef = request.reference_no.startsWith('DRAFT-')
    ? 'Draft'
    : request.reference_no

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/requests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            My requests
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-slate-400">{displayRef}</span>
              <RequestStatusBadge status={request.status} />
              {request.budget_flag && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Over budget
                </span>
              )}
              {request.duplicate_flag && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  Possible duplicate
                </span>
              )}
            </div>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">{request.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {request.status === 'draft' && isRequester && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/requests/new?draft=${request.id}`}>Edit draft</Link>
              </Button>
            )}
            <RequestDetailActions requestId={id} canCancel={canCancel} />
          </div>
        </div>

        {/* Main details card */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-medium text-slate-500">Type</dt>
              <dd className="mt-1 text-slate-800 capitalize">
                {request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Amount</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {formatCurrency(request.amount, request.currency)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Priority</dt>
              <dd className="mt-1 capitalize text-slate-800">{request.priority}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Category</dt>
              <dd className="mt-1 text-slate-800">{request.category}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Cost centre</dt>
              <dd className="mt-1 text-slate-800">
                {(request.cost_centre as unknown as { code: string; name: string } | null)
                  ? `${(request.cost_centre as unknown as { code: string; name: string }).code} — ${(request.cost_centre as unknown as { code: string; name: string }).name}`
                  : '—'}
              </dd>
            </div>
            {request.vendor_name && (
              <div>
                <dt className="font-medium text-slate-500">Vendor</dt>
                <dd className="mt-1 text-slate-800">{request.vendor_name}</dd>
              </div>
            )}
            {request.project_code && (
              <div>
                <dt className="font-medium text-slate-500">Project code</dt>
                <dd className="mt-1 text-slate-800">{request.project_code}</dd>
              </div>
            )}
            {request.required_by && (
              <div>
                <dt className="font-medium text-slate-500">Required by</dt>
                <dd className="mt-1 text-slate-800">{formatDate(request.required_by)}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-slate-500">Submitted</dt>
              <dd className="mt-1 text-slate-800">
                {request.submitted_at ? formatDate(request.submitted_at) : '—'}
              </dd>
            </div>
          </dl>

          {request.description && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium text-slate-500">Description</p>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{request.description}</p>
              </div>
            </>
          )}

          {request.justification && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Business justification</p>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{request.justification}</p>
            </div>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Attachments ({attachments.length})
            </h2>
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-slate-700">{att.file_name}</span>
                  {att.file_size_bytes && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {att.file_size_bytes < 1024 * 1024
                        ? `${Math.round(att.file_size_bytes / 1024)} KB`
                        : `${(att.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approval timeline */}
        {events.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Approval history</h2>
            <ol className="relative space-y-4 border-l border-slate-200 pl-6">
              {events.map((event) => {
                const approver = event.approver as unknown as { full_name: string } | null
                return (
                  <li key={event.id} className="relative">
                    <div className="absolute -left-[1.625rem] flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white">
                      <Clock className="h-3 w-3 text-slate-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {ACTION_LABELS[event.action] ?? event.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          by {approver?.full_name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                      {event.comment && (
                        <p className="mt-1 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {event.comment}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {events.length === 0 && request.status !== 'draft' && (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <p className="text-sm text-slate-400">No approval events yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
