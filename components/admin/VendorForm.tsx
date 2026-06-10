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
import type { Vendor } from '@/types/domain'

export const VENDOR_CATEGORIES = [
  'General Operational',
  'IT Hardware & Software',
  'Office Supplies & Stationery',
  'Professional Services',
  'Facilities & Maintenance',
  'Travel & Accommodation',
  'Marketing & Events',
  'Employee Expense',
  'Other',
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor?: Vendor | null
  onSave: () => void
}

export function VendorForm({ open, onOpenChange, vendor, onSave }: Props) {
  const isEdit = !!vendor
  const [name, setName] = useState(vendor?.name ?? '')
  const [category, setCategory] = useState(vendor?.category ?? '')
  const [contactName, setContactName] = useState(vendor?.contact_name ?? '')
  const [contactEmail, setContactEmail] = useState(vendor?.contact_email ?? '')
  const [preferred, setPreferred] = useState(vendor?.preferred ?? false)
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending'>(vendor?.status ?? 'active')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      ...(isEdit ? { id: vendor!.id } : {}),
      name: name.trim(),
      category,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      preferred,
      status,
    }

    const res = await fetch('/api/admin/vendors', {
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
      setName(vendor?.name ?? '')
      setCategory(vendor?.category ?? '')
      setContactName(vendor?.contact_name ?? '')
      setContactEmail(vendor?.contact_email ?? '')
      setPreferred(vendor?.preferred ?? false)
      setStatus(vendor?.status ?? 'active')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update vendor details.' : 'Add a new vendor to the approved catalogue.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Vendor name *</Label>
            <Input
              id="v-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Supplies Ltd"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="v-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-contact-name">Contact name</Label>
              <Input
                id="v-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-contact-email">Contact email</Label>
              <Input
                id="v-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jane@vendor.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger id="v-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-0.5 gap-2">
              <input
                id="v-preferred"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                checked={preferred}
                onChange={(e) => setPreferred(e.target.checked)}
              />
              <Label htmlFor="v-preferred" className="cursor-pointer">
                Preferred vendor
              </Label>
            </div>
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
            <Button type="submit" disabled={saving || !name.trim() || !category}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
