'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'

const ACTIONS = [
  { value: '', label: 'All actions' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'info_requested', label: 'Info requested' },
  { value: 'info_provided', label: 'Info provided' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'delegated', label: 'Delegated' },
]

const DOC_TYPES = [
  { value: '', label: 'All document types' },
  { value: 'purchase_request', label: 'Purchase Requests' },
  { value: 'expense_claim', label: 'Expense Claims' },
]

interface AuditLogFiltersProps {
  canExportCsv: boolean
}

export function AuditLogFilters({ canExportCsv }: AuditLogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const csvHref = (() => {
    const params = new URLSearchParams()
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const documentType = searchParams.get('documentType')
    const action = searchParams.get('action')
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (documentType) params.set('documentType', documentType)
    if (action) params.set('action', action)
    return `/api/reports/audit-csv?${params.toString()}`
  })()

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Date from */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
        <input
          type="date"
          defaultValue={searchParams.get('dateFrom') ?? ''}
          onChange={e => update('dateFrom', e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Date to */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
        <input
          type="date"
          defaultValue={searchParams.get('dateTo') ?? ''}
          onChange={e => update('dateTo', e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Document type */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Document type</label>
        <select
          defaultValue={searchParams.get('documentType') ?? ''}
          onChange={e => update('documentType', e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {DOC_TYPES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Action */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
        <select
          defaultValue={searchParams.get('action') ?? ''}
          onChange={e => update('action', e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {ACTIONS.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        {/* Clear filters */}
        {(searchParams.get('dateFrom') || searchParams.get('dateTo') || searchParams.get('documentType') || searchParams.get('action')) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
          >
            Clear filters
          </Button>
        )}

        {/* CSV export */}
        {canExportCsv && (
          <Button asChild variant="outline" size="sm">
            <a href={csvHref} download>
              Export CSV
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
