'use client'

import { cn, formatCurrency } from '@/lib/utils'
import type { BudgetPosition } from '@/lib/data/spend-requests'

interface BudgetIndicatorProps {
  position: BudgetPosition | null
  requestedAmount?: number
  loading?: boolean
  className?: string
}

export function BudgetIndicator({ position, requestedAmount, loading, className }: BudgetIndicatorProps) {
  if (loading) {
    return (
      <div className={cn('rounded-md border bg-slate-50 p-3 text-sm', className)}>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      </div>
    )
  }

  if (!position) return null

  const postSubmitCommitted = requestedAmount
    ? position.committed + requestedAmount
    : position.committed
  const postSubmitAvailable = position.budget_amount - postSubmitCommitted
  const utilisation = position.budget_amount > 0
    ? (postSubmitCommitted / position.budget_amount) * 100
    : 0

  const isOver = postSubmitAvailable < 0
  const isWarning = !isOver && utilisation >= 90

  return (
    <div
      className={cn(
        'rounded-md border p-3 text-sm',
        isOver && 'border-red-200 bg-red-50',
        isWarning && 'border-amber-200 bg-amber-50',
        !isOver && !isWarning && 'border-slate-200 bg-slate-50',
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-slate-700">Budget available</span>
        <span
          className={cn(
            'font-semibold',
            isOver && 'text-red-600',
            isWarning && 'text-amber-600',
            !isOver && !isWarning && 'text-green-600'
          )}
        >
          {formatCurrency(Math.max(0, postSubmitAvailable))}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOver && 'bg-red-500',
            isWarning && 'bg-amber-400',
            !isOver && !isWarning && 'bg-green-500'
          )}
          style={{ width: `${Math.min(utilisation, 100)}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>Budget: {formatCurrency(position.budget_amount)}</span>
        <span>{Math.round(utilisation)}% committed</span>
      </div>

      {isOver && requestedAmount && (
        <p className="mt-2 text-xs font-medium text-red-600">
          This request would exceed the available budget by{' '}
          {formatCurrency(Math.abs(postSubmitAvailable))}.
        </p>
      )}
    </div>
  )
}
