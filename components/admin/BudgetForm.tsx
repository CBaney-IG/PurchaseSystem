'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { VENDOR_CATEGORIES } from './VendorForm'
import type { CostCentreWithOwner } from '@/lib/data/cost-centres'
import type { BudgetWithCostCentre } from '@/lib/data/budgets'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget?: BudgetWithCostCentre | null
  costCentres: CostCentreWithOwner[]
  year: number
  onSave: () => void
}

export function BudgetForm({ open, onOpenChange, budget, costCentres, year, onSave }: Props) {
  const isEdit = !!budget
  const [costCentreId, setCostCentreId] = useState(budget?.cost_centre_id ?? '')
  const [category, setCategory] = useState(budget?.category ?? '')
  const [amount, setAmount] = useState(budget?.amount?.toString() ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const requiresReason = isEdit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (requiresReason && !reason.trim()) {
      setError('A reason is required for budget adjustments')
      return
    }

    setSaving(true)

    const payload = {
      cost_centre_id: costCentreId,
      category,
      period_year: year,
      amount: Number(amount),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    }

    const res = await fetch('/api/admin/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error?.message ?? 'Save failed')
      setSaving(false)
      return
    }

    setSaving(false)
    onOpenChange(false)
    onSave()
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setCostCentreId(budget?.cost_centre_id ?? '')
      setCategory(budget?.category ?? '')
      setAmount(budget?.amount?.toString() ?? '')
      setReason('')
      setError(null)
    }
    onOpenChange(open)
  }

  const isValid = costCentreId && category && amount && Number(amount) > 0 && (!requiresReason || reason.trim())

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Adjust budget' : 'Set budget'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Adjust the ${year} annual budget for ${budget?.cost_centre?.code} — ${budget?.category}.`
              : `Set an annual budget for ${year}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="b-cc">Cost centre *</Label>
                <Select value={costCentreId} onValueChange={setCostCentreId} required>
                  <SelectTrigger id="b-cc">
                    <SelectValue placeholder="Select cost centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCentres.filter((cc) => cc.active).map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="b-category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="b-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.filter((c) => c !== 'Other').map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="b-amount">Annual budget amount (ZAR) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
              <Input
                id="b-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {requiresReason && (
            <div className="space-y-1.5">
              <Label htmlFor="b-reason">Reason for adjustment *</Label>
              <Textarea
                id="b-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Board-approved mid-year budget increase for Q3 IT projects"
                rows={3}
                required
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving ? 'Saving…' : isEdit ? 'Save adjustment' : 'Set budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
