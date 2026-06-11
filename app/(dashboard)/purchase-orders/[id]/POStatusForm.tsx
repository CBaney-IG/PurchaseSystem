'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updatePOAction } from './actions'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/domain'

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft:        'Draft',
  issued:       'Issued',
  acknowledged: 'Acknowledged',
  received:     'Received',
  invoiced:     'Invoiced',
  closed:       'Closed',
  cancelled:    'Cancelled',
}

interface POStatusFormProps {
  po: PurchaseOrder
  isValidTransition: (from: PurchaseOrderStatus, to: PurchaseOrderStatus) => boolean
}

const ALL_STATUSES: PurchaseOrderStatus[] = [
  'draft', 'issued', 'acknowledged', 'received', 'invoiced', 'closed', 'cancelled',
]

export function POStatusForm({ po, isValidTransition }: POStatusFormProps) {
  const [state, action, pending] = useActionState(updatePOAction, {})

  const validNextStatuses = ALL_STATUSES.filter(
    (s) => s !== po.status && isValidTransition(po.status, s)
  )

  const isTerminal = po.status === 'closed' || po.status === 'cancelled'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 uppercase tracking-wide">Update PO</h2>

      {state.error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          Purchase order updated.
        </div>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={po.id} />

        {/* Status change */}
        {!isTerminal && validNextStatuses.length > 0 && (
          <div>
            <Label htmlFor="status" className="text-xs font-medium text-slate-600">
              Update status
            </Label>
            <select
              id="status"
              name="status"
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="">— no change —</option>
              {validNextStatuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}

        {isTerminal && (
          <p className="text-xs text-slate-500">
            This PO is <strong>{STATUS_LABELS[po.status]}</strong>. No further status changes are possible.
          </p>
        )}

        {/* Expected delivery */}
        <div>
          <Label htmlFor="expected_delivery" className="text-xs font-medium text-slate-600">
            Expected delivery
          </Label>
          <input
            id="expected_delivery"
            name="expected_delivery"
            type="date"
            defaultValue={po.expected_delivery?.split('T')[0] ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-xs font-medium text-slate-600">
            Notes
          </Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={po.notes ?? ''}
            rows={4}
            placeholder="Vendor communication, delivery instructions, invoice reference…"
            className="mt-1 text-sm"
            maxLength={2000}
          />
        </div>

        <Button
          type="submit"
          disabled={pending || isTerminal}
          className="w-full"
          size="sm"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}
