'use client'

import { useState } from 'react'
import { Play, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { SimulateResult } from '@/lib/data/approval-matrix'

const ROLE_LABELS: Record<string, string> = {
  approver_l1: 'Approver L1',
  approver_l2: 'Approver L2',
  approver_l3: 'Approver L3',
  procurement_officer: 'Procurement Officer',
  finance: 'Finance',
  admin: 'Admin',
  group_admin: 'Group Admin',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: string[]
}

export function SimulatePathTool({ open, onOpenChange, categories }: Props) {
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<SimulateResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    const params = new URLSearchParams({ category, amount })
    const res = await fetch(`/api/admin/approval-matrix/simulate?${params}`)
    const json = await res.json()

    if (!res.ok) {
      setError(json.error?.message ?? 'Simulation failed')
      setLoading(false)
      return
    }

    setResult(json.data)
    setLoading(false)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setCategory('')
      setAmount('')
      setResult(null)
      setError(null)
    }
    onOpenChange(open)
  }

  const amountNum = Number(amount)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Simulate approval path</DialogTitle>
          <DialogDescription>
            Enter a category and amount to see exactly which approver levels would be required.
            This uses the live matrix and creates no records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sim-category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="sim-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-amount">Amount (ZAR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
              <Input
                id="sim-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setResult(null) }}
                className="pl-7"
                placeholder="5000"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!category || !amount || amountNum <= 0 || loading}
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            {loading ? 'Simulating…' : 'Simulate'}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result !== null && (
          <div className="mt-2">
            {result.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No approval levels configured for this category. The request would be auto-approved.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  R{Number(amount).toLocaleString('en-ZA')} — {category}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {result.map((step, i) => (
                    <div key={step.level} className="flex items-center gap-1.5">
                      <div className="bg-slate-900 text-white rounded px-2.5 py-1 text-sm font-medium flex items-center gap-1.5">
                        <span className="text-slate-400 text-xs">L{step.level}</span>
                        <span>{ROLE_LABELS[step.approver_role] ?? step.approver_role}</span>
                      </div>
                      {i < result.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.length} approval level{result.length !== 1 ? 's' : ''} required
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
