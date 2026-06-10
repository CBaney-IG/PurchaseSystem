'use client'

import { cn } from '@/lib/utils'

export interface ApprovalLevel {
  level: number
  approver_role: string
  min_amount: number
  max_amount: number | null
  escalate_hours: number
}

const ROLE_LABELS: Record<string, string> = {
  approver_l1: 'Line Manager (L1)',
  approver_l2: 'Senior Manager (L2)',
  approver_l3: 'CFO / Finance Director (L3)',
  procurement_officer: 'Procurement Officer',
  finance: 'Finance',
  admin: 'Administrator',
  group_admin: 'Group Administrator',
}

interface ApprovalPathPreviewProps {
  levels: ApprovalLevel[]
  loading?: boolean
  className?: string
}

export function ApprovalPathPreview({ levels, loading, className }: ApprovalPathPreviewProps) {
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  if (levels.length === 0) {
    return (
      <p className={cn('text-sm text-slate-500', className)}>
        No approval required for this amount and category.
      </p>
    )
  }

  return (
    <ol className={cn('space-y-2', className)}>
      {levels.map((level, index) => (
        <li key={level.level} className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {ROLE_LABELS[level.approver_role] ?? level.approver_role}
            </p>
            <p className="text-xs text-slate-500">
              Escalates after {level.escalate_hours}h if unanswered
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
