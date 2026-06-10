'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BudgetForm } from './BudgetForm'
import type { CostCentreWithOwner } from '@/lib/data/cost-centres'
import type { BudgetWithCostCentre } from '@/lib/data/budgets'

function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

function utilisation(committed: number, amount: number): number {
  if (amount === 0) return 0
  return Math.min(Math.round((committed / amount) * 100), 100)
}

interface Props {
  budgets: BudgetWithCostCentre[]
  costCentres: CostCentreWithOwner[]
  year: number
  onRefresh: () => void
}

export function BudgetTable({ budgets, costCentres, year, onRefresh }: Props) {
  const [, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<BudgetWithCostCentre | null>(null)

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No budgets set for {year}</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cost centre</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Committed</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead>Utilisation</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((b) => {
            const remaining = b.amount - b.committed
            const pct = utilisation(b.committed, b.amount)
            const overBudget = remaining < 0

            return (
              <TableRow key={b.id}>
                <TableCell className="font-medium text-sm">
                  {b.cost_centre ? `${b.cost_centre.code} — ${b.cost_centre.name}` : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{b.category}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatZAR(b.amount)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {formatZAR(b.committed)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm font-medium ${overBudget ? 'text-red-600' : 'text-green-700'}`}
                >
                  {overBudget ? '−' : ''}{formatZAR(Math.abs(remaining))}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-16">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium tabular-nums ${pct >= 100 ? 'text-red-600' : pct >= 90 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {pct}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditTarget(b)}
                    title="Adjust budget"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Adjust budget</span>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <BudgetForm
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        budget={editTarget}
        costCentres={costCentres}
        year={year}
        onSave={() => startTransition(() => onRefresh())}
      />
    </>
  )
}
