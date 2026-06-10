'use client'

import { cn } from '@/lib/utils'
import type { SpendRequestStatus } from '@/types/domain'

interface StatusConfig {
  label: string
  className: string
}

const STATUS_CONFIG: Record<SpendRequestStatus, StatusConfig> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  submitted: { label: 'Submitted', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_l1: { label: 'Pending L1', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_l2: { label: 'Pending L2', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_l3: { label: 'Pending L3', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_info: { label: 'Info Needed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-400 border-slate-200' },
  converted: { label: 'Converted', className: 'bg-green-50 text-green-700 border-green-200' },
}

interface RequestStatusBadgeProps {
  status: SpendRequestStatus
  className?: string
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
