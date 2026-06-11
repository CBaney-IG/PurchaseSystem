import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listPurchaseOrders } from '@/lib/data/purchase-orders'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/domain'

const PO_ACCESS_ROLES = ['procurement_officer', 'finance', 'admin', 'group_admin']

const STATUS_BADGE: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft:        { label: 'Draft',        className: 'bg-slate-100 text-slate-700' },
  issued:       { label: 'Issued',       className: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Acknowledged', className: 'bg-indigo-100 text-indigo-700' },
  received:     { label: 'Received',     className: 'bg-amber-100 text-amber-700' },
  invoiced:     { label: 'Invoiced',     className: 'bg-purple-100 text-purple-700' },
  closed:       { label: 'Closed',       className: 'bg-green-100 text-green-700' },
  cancelled:    { label: 'Cancelled',    className: 'bg-red-100 text-red-700' },
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const { label, className } = STATUS_BADGE[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (!PO_ACCESS_ROLES.includes(profile.role)) redirect('/dashboard')

  let orders: PurchaseOrder[] = []
  try {
    orders = await listPurchaseOrders()
  } catch {
    // show empty state on error
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-generated from approved purchase requests. Update status as POs progress through delivery and invoicing.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-medium text-slate-600">No purchase orders yet</p>
            <p className="mt-1 text-sm text-slate-400">
              POs are created automatically when a purchase request is fully approved.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">PO Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">From PR</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-slate-900">{po.reference_no}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {po.request ? (
                        <Link href={`/requests/${po.request_id}`} className="font-mono text-sm text-blue-600 hover:underline">
                          {po.request.reference_no}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900 line-clamp-1">{po.request?.title ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{po.vendor?.name ?? po.vendor_name ?? '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(po.amount, po.currency)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link href={`/purchase-orders/${po.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        Open →
                      </Link>
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
