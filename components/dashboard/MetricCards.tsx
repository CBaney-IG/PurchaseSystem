import { getDashboardMetrics } from '@/lib/data/dashboard'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/domain'

interface MetricCardsProps {
  userId: string
  role: UserRole
  year: number
}

function utilisationColor(pct: number | null): string {
  if (pct === null) return 'text-slate-400'
  if (pct >= 90) return 'text-red-600'
  if (pct >= 75) return 'text-amber-600'
  return 'text-green-700'
}

export async function MetricCards({ userId, role, year }: MetricCardsProps) {
  const {
    myPendingCount,
    pendingMyApprovalCount,
    entityBudgetUtilisationPct,
    ytdActuals,
    ytdBudget,
  } = await getDashboardMetrics(userId, role, year)

  const ytdPct = ytdBudget > 0 ? (ytdActuals / ytdBudget) * 100 : null

  const cards = [
    {
      label: 'My Pending Requests',
      value: String(myPendingCount),
      sub:
        myPendingCount === 0
          ? 'no active requests'
          : myPendingCount === 1
            ? '1 request awaiting approval'
            : `${myPendingCount} requests awaiting approval`,
      valueClass: myPendingCount > 0 ? 'text-slate-900' : 'text-slate-400',
    },
    {
      label: 'Pending My Approval',
      value: String(pendingMyApprovalCount),
      sub:
        pendingMyApprovalCount === 0
          ? 'queue is clear'
          : pendingMyApprovalCount === 1
            ? '1 request in your queue'
            : `${pendingMyApprovalCount} requests in your queue`,
      valueClass: pendingMyApprovalCount > 0 ? 'text-amber-600' : 'text-slate-400',
    },
    {
      label: 'Budget Utilisation',
      value:
        entityBudgetUtilisationPct !== null
          ? `${Math.round(entityBudgetUtilisationPct)}%`
          : '—',
      sub: 'committed vs total budget',
      valueClass: utilisationColor(entityBudgetUtilisationPct),
    },
    {
      label: 'YTD Spend vs Budget',
      value: ytdBudget > 0 ? formatCurrency(ytdActuals) : '—',
      sub:
        ytdBudget > 0
          ? `of ${formatCurrency(ytdBudget)}${ytdPct !== null ? ` · ${Math.round(ytdPct)}%` : ''}`
          : 'no budgets configured',
      valueClass: utilisationColor(ytdPct),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums', card.valueClass)}>
            {card.value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
