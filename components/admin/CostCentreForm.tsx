'use client'

import { useState } from 'react'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Profile } from '@/types/domain'
import type { CostCentreWithOwner } from '@/lib/data/cost-centres'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  costCentre?: CostCentreWithOwner | null
  costCentres: CostCentreWithOwner[]
  profiles: Pick<Profile, 'id' | 'full_name'>[]
  onSave: () => void
}

const NONE = '__none__'

export function CostCentreForm({ open, onOpenChange, costCentre, costCentres, profiles, onSave }: Props) {
  const isEdit = !!costCentre
  const [code, setCode] = useState(costCentre?.code ?? '')
  const [name, setName] = useState(costCentre?.name ?? '')
  const [budgetOwnerId, setBudgetOwnerId] = useState(costCentre?.budget_owner_id ?? NONE)
  const [parentId, setParentId] = useState(costCentre?.parent_id ?? NONE)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      ...(isEdit ? { id: costCentre!.id } : {}),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      budget_owner_id: budgetOwnerId === NONE ? null : budgetOwnerId,
      parent_id: parentId === NONE ? null : parentId,
    }

    const res = await fetch('/api/admin/cost-centres', {
      method: isEdit ? 'PATCH' : 'POST',
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
      setCode(costCentre?.code ?? '')
      setName(costCentre?.name ?? '')
      setBudgetOwnerId(costCentre?.budget_owner_id ?? NONE)
      setParentId(costCentre?.parent_id ?? NONE)
      setError(null)
    }
    onOpenChange(open)
  }

  // Exclude the current cost centre from the parent dropdown (can't be its own parent)
  const parentOptions = costCentres.filter((cc) => cc.id !== costCentre?.id)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit cost centre' : 'Add cost centre'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update cost centre details.' : 'Create a new cost centre for budget tracking.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="cc-code">Code *</Label>
              <Input
                id="cc-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CC-001"
                className="uppercase"
                maxLength={20}
                required
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label htmlFor="cc-name">Name *</Label>
              <Input
                id="cc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Operations"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-owner">Budget owner</Label>
            <Select value={budgetOwnerId} onValueChange={setBudgetOwnerId}>
              <SelectTrigger id="cc-owner">
                <SelectValue placeholder="No budget owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No budget owner</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-parent">Parent cost centre</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="cc-parent">
                <SelectValue placeholder="No parent (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No parent (top-level)</SelectItem>
                {parentOptions.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !code.trim() || !name.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add cost centre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
