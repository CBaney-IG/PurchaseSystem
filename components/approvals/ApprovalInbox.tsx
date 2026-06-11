'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge'
import { RequestDrawer } from './RequestDrawer'
import { BulkApproveDialog } from './BulkApproveDialog'
import { formatCurrency } from '@/lib/utils'
import type { SpendRequest } from '@/types/domain'

const MAX_BULK = 20

type InboxRow = Omit<SpendRequest, 'requester' | 'cost_centre'> & {
  requester: { id: string; full_name: string; email: string } | null
  cost_centre: { id: string; code: string; name: string } | null
}

export function daysWaiting(submittedAt: string | null): number {
  if (!submittedAt) return 0
  const ms = Date.now() - new Date(submittedAt).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function ApprovalInbox() {
  const [rows, setRows] = useState<InboxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const loadInbox = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/approvals/inbox?limit=100')
      const body = await res.json()
      if (body.error) throw new Error(body.error.message)
      setRows(body.data.pending ?? [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= MAX_BULK) return prev
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    const selectable = rows.slice(0, MAX_BULK).map((r) => r.id)
    const allSelected = selectable.every((id) => selected.has(id))
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectable))
    }
  }

  function handleActionComplete(requestId: string) {
    setOpenDrawerId(null)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(requestId)
      return next
    })
    loadInbox()
  }

  async function handleBulkApprove(comment: string) {
    const ids = Array.from(selected)
    for (const id of ids) {
      const res = await fetch(`/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment || null }),
      })
      const body = await res.json()
      if (!res.ok || body.error) {
        throw new Error(`Failed to approve ${id}: ${body.error?.message ?? 'Unknown error'}`)
      }
    }
    setSelected(new Set())
    setBulkOpen(false)
    loadInbox()
  }

  const selectedRows = rows.filter((r) => selected.has(r.id))
  const totalAmount = selectedRows.reduce((sum, r) => sum + r.amount, 0)
  const allOnPageSelected =
    rows.length > 0 && rows.slice(0, MAX_BULK).every((r) => selected.has(r.id))

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-red-200 py-12 text-center">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-slate-600">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={loadInbox}>
          Retry
        </Button>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center">
        <p className="text-sm font-medium text-slate-500">No pending requests</p>
        <p className="mt-1 text-xs text-slate-400">
          You will see requests here when they reach your approval level.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-sm text-slate-600">
            {selected.size} selected — {formatCurrency(totalAmount)}
          </span>
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            Bulk approve {selected.size}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Reference
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Title
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell">
                Requester
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 lg:table-cell">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Amount
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 xl:table-cell">
                Cost centre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 lg:table-cell">
                Waiting
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const days = daysWaiting(row.submitted_at)
              const isChecked = selected.has(row.id)
              const atLimit = selected.size >= MAX_BULK && !isChecked

              return (
                <tr
                  key={row.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => setOpenDrawerId(row.id)}
                >
                  <td
                    className="w-10 px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={atLimit}
                      onCheckedChange={() => toggleSelect(row.id)}
                      aria-label={`Select ${row.reference_no}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-slate-600">
                      {row.reference_no}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.priority === 'urgent' && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          Urgent
                        </span>
                      )}
                      <span className="font-medium text-slate-800 line-clamp-1">{row.title}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {row.requester?.full_name ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {row.category}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrency(row.amount, row.currency)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 xl:table-cell">
                    {row.cost_centre?.code ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={row.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">
                    <span
                      className={
                        days >= 2
                          ? 'text-sm font-medium text-red-600'
                          : days >= 1
                            ? 'text-sm font-medium text-amber-600'
                            : 'text-sm text-slate-400'
                      }
                    >
                      {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length >= MAX_BULK && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-400">
            Showing {rows.length} requests. Bulk approve is limited to {MAX_BULK} at a time.
          </div>
        )}
      </div>

      <RequestDrawer
        requestId={openDrawerId}
        onClose={() => setOpenDrawerId(null)}
        onActionComplete={handleActionComplete}
      />

      <BulkApproveDialog
        open={bulkOpen}
        selectedCount={selected.size}
        totalAmount={totalAmount}
        onConfirm={handleBulkApprove}
        onClose={() => setBulkOpen(false)}
      />
    </>
  )
}
