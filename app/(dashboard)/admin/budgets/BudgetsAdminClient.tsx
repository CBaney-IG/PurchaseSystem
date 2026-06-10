'use client'

import { useState, useCallback } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { BudgetTable } from '@/components/admin/BudgetTable'
import { BudgetForm } from '@/components/admin/BudgetForm'
import { BudgetCSVImport } from '@/components/admin/BudgetCSVImport'
import { AdminNav } from '@/components/admin/AdminNav'
import type { CostCentreWithOwner } from '@/lib/data/cost-centres'
import type { BudgetWithCostCentre } from '@/lib/data/budgets'

interface Props {
  initialBudgets: BudgetWithCostCentre[]
  costCentres: CostCentreWithOwner[]
  defaultYear: number
  callerRole: string
}

export function BudgetsAdminClient({ initialBudgets, costCentres, defaultYear, callerRole }: Props) {
  const [budgets, setBudgets] = useState<BudgetWithCostCentre[]>(initialBudgets)
  const [year, setYear] = useState(defaultYear)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const refresh = useCallback(async (y = year) => {
    const res = await fetch(`/api/admin/budgets?year=${y}`)
    const json = await res.json()
    if (json.data) setBudgets(json.data)
  }, [year])

  async function handleYearChange(newYear: number) {
    setYear(newYear)
    const res = await fetch(`/api/admin/budgets?year=${newYear}`)
    const json = await res.json()
    if (json.data) setBudgets(json.data)
  }

  return (
    <div className="p-8">
      <AdminNav callerRole={callerRole} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} for {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="year-select" className="text-sm text-muted-foreground whitespace-nowrap">Year:</Label>
            <Input
              id="year-select"
              type="number"
              min="2020"
              max="2040"
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="w-24 h-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Set budget
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <BudgetTable
          budgets={budgets}
          costCentres={costCentres}
          year={year}
          onRefresh={() => refresh(year)}
        />
      </div>

      <BudgetForm
        open={showAdd}
        onOpenChange={setShowAdd}
        budget={null}
        costCentres={costCentres}
        year={year}
        onSave={() => refresh(year)}
      />

      <BudgetCSVImport
        open={showImport}
        onOpenChange={setShowImport}
        defaultYear={year}
        onImported={() => refresh(year)}
      />
    </div>
  )
}
