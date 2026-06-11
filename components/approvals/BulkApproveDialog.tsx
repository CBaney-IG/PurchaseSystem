'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'

interface BulkApproveDialogProps {
  open: boolean
  selectedCount: number
  totalAmount: number
  currency?: string
  onConfirm: (comment: string) => Promise<void>
  onClose: () => void
}

export function BulkApproveDialog({
  open,
  selectedCount,
  totalAmount,
  currency = 'ZAR',
  onConfirm,
  onClose,
}: BulkApproveDialogProps) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (submitting) return
    setComment('')
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm(comment.trim())
      setComment('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk approve {selectedCount} request{selectedCount === 1 ? '' : 's'}</DialogTitle>
          <DialogDescription>
            You are approving {selectedCount} request{selectedCount === 1 ? '' : 's'} totalling{' '}
            <span className="font-semibold text-slate-700">{formatCurrency(totalAmount, currency)}</span>.
            {' '}Each approval will be recorded individually. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="bulk-comment" className="text-sm font-medium text-slate-700">
            Comment (optional — applied to all)
          </Label>
          <Textarea
            id="bulk-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment that will appear on all approved requests…"
            rows={3}
            className="mt-1.5"
            disabled={submitting}
          />
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve {selectedCount} request{selectedCount === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
