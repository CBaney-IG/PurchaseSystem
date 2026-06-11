import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPurchaseOrder, isValidPOTransition } from '@/lib/data/purchase-orders'
import { POStatusForm } from './POStatusForm'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { PurchaseOrderStatus } from '@/types/domain'

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
}

type Params = Promise<{ id: string }>

export default async function PurchaseOrderDetailPage({ params }: { params: Params }) {
  const { id } = await params

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

  const po = await getPurchaseOrder(id)
  if (!po) notFound()

  const { label: statusLabel, className: statusClass } = STATUS_BADGE[po.status] ?? { label: po.status, className: '' }

  const canEdit = profile.role === 'procurement_officer' || profile.role === 'admin' || profile.role === 'group_admin'

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">

        {/* Back link */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Purchase Orders
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-mono text-2xl font-bold text-slate-900">{po.reference_no}</h1>
              <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              From{' '}
              {po.request ? (
                <Link href={`/requests/${po.request_id}`} className="font-mono text-blue-600 hover:underline">
                  {po.request.reference_no}
                </Link>
              ) : 'approved purchase request'}
              {po.request?.title && ` — ${po.request.title}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(po.amount, po.currency)}</p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: PO details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Key fields */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-700 uppercase tracking-wide">Details</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Vendor</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{po.vendor?.name ?? po.vendor_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Amount</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(po.amount, po.currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Issued</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{formatDate(po.issued_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Expected Delivery</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{formatDate(po.expected_delivery)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Created</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{formatDate(po.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Last Updated</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{formatDate(po.updated_at)}</dd>
                </div>
              </dl>

              {po.notes && (
                <div className="mt-4">
                  <dt className="text-xs font-medium text-slate-500 mb-1">Notes</dt>
                  <dd className="rounded bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 whitespace-pre-wrap">{po.notes}</dd>
                </div>
              )}
            </div>

            {/* Originating PR link */}
            {po.request && (
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">Originating Request</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900">{po.request.reference_no}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{po.request.title}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/requests/${po.request_id}`}>View PR →</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Status update form */}
          {canEdit && (
            <div className="lg:col-span-1">
              <POStatusForm po={po} isValidTransition={isValidPOTransition} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
