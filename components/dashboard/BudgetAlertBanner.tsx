import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { getOverBudgetCostCentres } from '@/lib/data/dashboard'

interface BudgetAlertBannerProps {
  year: number
}

export async function BudgetAlertBanner({ year }: BudgetAlertBannerProps) {
  const overBudget = await getOverBudgetCostCentres(year)
  if (overBudget.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-900">
            {overBudget.length === 1
              ? '1 cost centre is near or over budget'
              : `${overBudget.length} cost centres are near or over budget`}
          </p>
          <ul className="mt-1 space-y-0.5">
            {overBudget.slice(0, 5).map((cc) => (
              <li key={`${cc.id}-${cc.category}`} className="text-xs text-amber-800">
                <span className="font-medium">{cc.code}</span> — {cc.category}:{' '}
                <span
                  className={cc.utilisationPct >= 100 ? 'font-medium text-red-700' : ''}
                >
                  {Math.round(cc.utilisationPct)}% committed
                </span>
              </li>
            ))}
            {overBudget.length > 5 && (
              <li className="text-xs text-amber-700">+{overBudget.length - 5} more</li>
            )}
          </ul>
        </div>
        <Link
          href="/admin/budgets"
          className="flex-shrink-0 text-xs font-medium text-amber-700 underline hover:text-amber-900"
        >
          View budgets
        </Link>
      </div>
    </div>
  )
}
