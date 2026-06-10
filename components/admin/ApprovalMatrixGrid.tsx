'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { ApprovalMatrix, UserRole } from '@/types/domain'

const APPROVER_ROLES: UserRole[] = [
  'approver_l1', 'approver_l2', 'approver_l3',
  'procurement_officer', 'finance', 'admin', 'group_admin',
]

const ROLE_LABELS: Record<string, string> = {
  approver_l1: 'Approver L1',
  approver_l2: 'Approver L2',
  approver_l3: 'Approver L3',
  procurement_officer: 'Procurement Officer',
  finance: 'Finance',
  admin: 'Admin',
  group_admin: 'Group Admin',
}

function formatRange(min: number, max: number | null): string {
  const fmt = (n: number) => `R${n.toLocaleString('en-ZA')}`
  if (max === null) return `${fmt(min)}+`
  if (min === 0) return `Up to ${fmt(max)}`
  return `${fmt(min)} – ${fmt(max)}`
}

interface CellEditState {
  cell: ApprovalMatrix | null
  category: string
  level: number
}

interface Props {
  matrix: ApprovalMatrix[]
  onRefresh: () => void
}

export function ApprovalMatrixGrid({ matrix, onRefresh }: Props) {
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState<CellEditState | null>(null)

  // Derive grid dimensions from the data
  const categories = [...new Set(matrix.map((e) => e.category))].sort()
  const maxLevel = Math.max(3, ...matrix.map((e) => e.level))
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1)

  // Build a lookup: category → level → ApprovalMatrix
  const lookup = new Map<string, Map<number, ApprovalMatrix>>()
  for (const entry of matrix) {
    if (!lookup.has(entry.category)) lookup.set(entry.category, new Map())
    lookup.get(entry.category)!.set(entry.level, entry)
  }

  function openEdit(cell: ApprovalMatrix | null, category: string, level: number) {
    setEditing({ cell, category, level })
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 font-medium text-slate-600 w-48 border-b border-slate-200">
                Category
              </th>
              {levels.map((l) => (
                <th
                  key={l}
                  className="text-center py-2 px-3 font-medium text-slate-600 border-b border-slate-200 min-w-[160px]"
                >
                  Level {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 pr-4 font-medium text-slate-900">{category}</td>
                {levels.map((level) => {
                  const cell = lookup.get(category)?.get(level)
                  return (
                    <td key={level} className="py-2 px-3 align-top">
                      {cell ? (
                        <button
                          className={`w-full text-left rounded px-2.5 py-2 border transition-colors group ${
                            cell.active
                              ? 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                              : 'border-dashed border-slate-200 bg-slate-50 opacity-60'
                          }`}
                          onClick={() => openEdit(cell, category, level)}
                          title="Click to edit"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-slate-900">
                                {formatRange(cell.min_amount, cell.max_amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {ROLE_LABELS[cell.approver_role] ?? cell.approver_role}
                              </p>
                              {!cell.active && (
                                <Badge variant="secondary" className="text-[10px] py-0">Inactive</Badge>
                              )}
                            </div>
                            <Pencil className="h-3 w-3 text-slate-300 group-hover:text-slate-500 shrink-0 mt-0.5 transition-colors" />
                          </div>
                        </button>
                      ) : (
                        <button
                          className="w-full text-center rounded px-2.5 py-2 border border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-xs"
                          onClick={() => openEdit(null, category, level)}
                          title="Add level"
                        >
                          <Plus className="h-3.5 w-3.5 mx-auto" />
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No approval matrix configured
          </div>
        )}
      </div>

      {editing !== null && (
        <MatrixCellEditor
          cell={editing.cell}
          category={editing.category}
          level={editing.level}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            startTransition(() => onRefresh())
          }}
        />
      )}
    </>
  )
}

// ---- Inline dialog editor ----

interface EditorProps {
  cell: ApprovalMatrix | null
  category: string
  level: number
  onClose: () => void
  onSaved: () => void
}

function MatrixCellEditor({ cell, category, level, onClose, onSaved }: EditorProps) {
  const isEdit = !!cell
  const [minAmount, setMinAmount] = useState(cell?.min_amount?.toString() ?? '0')
  const [maxAmount, setMaxAmount] = useState(cell?.max_amount?.toString() ?? '')
  const [noLimit, setNoLimit] = useState(cell ? cell.max_amount === null : false)
  const [role, setRole] = useState<UserRole>(cell?.approver_role ?? 'approver_l1')
  const [requireAll, setRequireAll] = useState(cell?.require_all ?? false)
  const [escalateHours, setEscalateHours] = useState(cell?.escalate_hours?.toString() ?? '48')
  const [active, setActive] = useState(cell?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = isEdit
      ? {
          id: cell!.id,
          min_amount: Number(minAmount),
          max_amount: noLimit ? null : Number(maxAmount),
          approver_role: role,
          require_all: requireAll,
          escalate_hours: Number(escalateHours),
          active,
        }
      : {
          category,
          level,
          min_amount: Number(minAmount),
          max_amount: noLimit ? null : Number(maxAmount),
          approver_role: role,
          require_all: requireAll,
          escalate_hours: Number(escalateHours),
        }

    const res = await fetch('/api/admin/approval-matrix', {
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
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit' : 'Add'} — {category} · Level {level}
          </DialogTitle>
          <DialogDescription>
            Set the approval threshold and role for this level. Changes take effect immediately for new requests.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mc-min">Min amount (ZAR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                <Input
                  id="mc-min"
                  type="number"
                  min="0"
                  step="1"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-max">Max amount (ZAR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                <Input
                  id="mc-max"
                  type="number"
                  min="1"
                  step="1"
                  value={noLimit ? '' : maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="pl-7"
                  disabled={noLimit}
                  placeholder={noLimit ? 'No limit' : ''}
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-slate-900"
                  checked={noLimit}
                  onChange={(e) => setNoLimit(e.target.checked)}
                />
                No upper limit
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mc-role">Required approver role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="mc-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mc-escalate">Escalation hours</Label>
              <Input
                id="mc-escalate"
                type="number"
                min="1"
                step="1"
                value={escalateHours}
                onChange={(e) => setEscalateHours(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-0.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-slate-900"
                  checked={requireAll}
                  onChange={(e) => setRequireAll(e.target.checked)}
                />
                All approvers must agree
              </label>
              {isEdit && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-slate-900"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  Active
                </label>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !role || (!noLimit && !maxAmount)}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add level'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
