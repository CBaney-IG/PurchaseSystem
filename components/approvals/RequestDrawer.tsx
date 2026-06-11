'use client'

import { useState, useEffect } from 'react'
import { Paperclip, Clock, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge'
import { ApprovalActionDialog, type ApprovalDialogAction } from './ApprovalActionDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SpendRequest, ApprovalEvent } from '@/types/domain'

type RequestWithDetail = Omit<SpendRequest, 'attachments'> & {
  approval_events: ApprovalEvent[]
  attachments: { id: string; file_name: string; file_size_bytes: number | null }[]
}

interface RequestDrawerProps {
  requestId: string | null
  onClose: () => void
  onActionComplete: (requestId: string) => void
}

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

export function RequestDrawer({ requestId, onClose, onActionComplete }: RequestDrawerProps) {
  const [request, setRequest] = useState<RequestWithDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<ApprovalDialogAction | null>(null)

  useEffect(() => {
    if (!requestId) {
      setRequest(null)
      return
    }
    setLoading(true)
    setFetchError(null)
    fetch(`/api/requests/${requestId}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.error) throw new Error(body.error.message)
        setRequest(body.data)
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false))
  }, [requestId])

  async function handleAction(action: ApprovalDialogAction, comment: string) {
    if (!requestId) return
    const endpoint =
      action === 'approve'
        ? `/api/approvals/${requestId}/approve`
        : action === 'reject'
          ? `/api/approvals/${requestId}/reject`
          : `/api/approvals/${requestId}/request-info`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: comment || null }),
    })
    const body = await res.json()
    if (!res.ok || body.error) {
      throw new Error(body.error?.message ?? 'Action failed')
    }
    onActionComplete(requestId)
  }

  const open = requestId !== null

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {loading && (
            <div className="space-y-4 p-6 pt-10">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {fetchError && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-slate-600">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          )}

          {request && !loading && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{request.reference_no}</span>
                  <RequestStatusBadge status={request.status} />
                  {request.priority === 'urgent' && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Urgent
                    </span>
                  )}
                  {request.budget_flag && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Over budget
                    </span>
                  )}
                </div>
                <SheetTitle className="text-left text-lg">{request.title}</SheetTitle>
                <SheetDescription className="text-left text-sm text-slate-500">
                  Submitted by{' '}
                  {(request.requester as unknown as { full_name: string } | null)?.full_name ?? 'Unknown'}
                  {request.submitted_at && ` on ${formatDate(request.submitted_at)}`}
                </SheetDescription>
              </SheetHeader>

              {/* Budget impact card */}
              <BudgetImpactCard
                amount={request.amount}
                currency={request.currency}
                budgetFlag={request.budget_flag}
              />

              {/* Request details */}
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-slate-500">Type</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Category</dt>
                    <dd className="mt-0.5 text-slate-800">{request.category}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Amount</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">
                      {formatCurrency(request.amount, request.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Cost centre</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {(request.cost_centre as unknown as { code: string; name: string } | null)
                        ? `${(request.cost_centre as unknown as { code: string; name: string }).code}`
                        : '—'}
                    </dd>
                  </div>
                  {request.vendor_name && (
                    <div>
                      <dt className="font-medium text-slate-500">Vendor</dt>
                      <dd className="mt-0.5 text-slate-800">{request.vendor_name}</dd>
                    </div>
                  )}
                  {request.project_code && (
                    <div>
                      <dt className="font-medium text-slate-500">Project code</dt>
                      <dd className="mt-0.5 text-slate-800">{request.project_code}</dd>
                    </div>
                  )}
                  {request.required_by && (
                    <div>
                      <dt className="font-medium text-slate-500">Required by</dt>
                      <dd className="mt-0.5 text-slate-800">{formatDate(request.required_by)}</dd>
                    </div>
                  )}
                </dl>

                {request.description && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-sm font-medium text-slate-500">Description</p>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                      {request.description}
                    </p>
                  </>
                )}

                {request.justification && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-500">Business justification</p>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                      {request.justification}
                    </p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {request.attachments.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Attachments ({request.attachments.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {request.attachments.map((att) => (
                      <li
                        key={att.id}
                        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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

              {/* Approval history timeline */}
              {request.approval_events.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Approval history
                  </h3>
                  <ol className="relative space-y-3 border-l border-slate-200 pl-5">
                    {request.approval_events.map((event) => {
                      const approver = event.approver as unknown as { full_name: string } | null
                      return (
                        <li key={event.id} className="relative">
                          <div className="absolute -left-[1.375rem] flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white">
                            <Clock className="h-2.5 w-2.5 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="text-sm font-medium text-slate-800">
                                {ACTION_LABELS[event.action] ?? event.action}
                              </span>
                              <span className="text-xs text-slate-400">
                                by {approver?.full_name ?? 'Unknown'}
                              </span>
                              <span className="text-xs text-slate-400">
                                · {formatDate(event.created_at)}
                              </span>
                            </div>
                            {event.comment && (
                              <p className="mt-1 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
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

              {/* Action buttons — only for pending_l statuses */}
              {request.status.startsWith('pending_l') && (
                <div className="sticky bottom-0 -mx-6 border-t border-slate-200 bg-white px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      className="flex-1 bg-green-600 text-white hover:bg-green-700"
                      onClick={() => setActiveAction('approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setActiveAction('reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setActiveAction('request_info')}
                    >
                      Request info
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {request && (
        <ApprovalActionDialog
          action={activeAction}
          requestRef={request.reference_no}
          onConfirm={(comment) => handleAction(activeAction!, comment)}
          onClose={() => setActiveAction(null)}
        />
      )}
    </>
  )
}

function BudgetImpactCard({
  amount,
  currency,
  budgetFlag,
}: {
  amount: number
  currency: string
  budgetFlag: boolean
}) {
  if (budgetFlag) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div>
          <p className="text-sm font-semibold text-red-700">Over budget</p>
          <p className="mt-0.5 text-xs text-red-600">
            This request of {formatCurrency(amount, currency)} exceeds the available budget for this
            cost centre and category.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      <div>
        <p className="text-sm font-semibold text-green-700">Within budget</p>
        <p className="mt-0.5 text-xs text-green-600">
          {formatCurrency(amount, currency)} is within the available budget for this cost centre and
          category.
        </p>
      </div>
    </div>
  )
}
