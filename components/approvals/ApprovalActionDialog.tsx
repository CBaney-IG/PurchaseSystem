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

export type ApprovalDialogAction = 'approve' | 'reject' | 'request_info'

interface ApprovalActionDialogProps {
  action: ApprovalDialogAction | null
  requestRef: string
  onConfirm: (comment: string) => Promise<void>
  onClose: () => void
}

const CONFIG: Record<ApprovalDialogAction, {
  title: string
  description: string
  commentLabel: string
  commentPlaceholder: string
  commentRequired: boolean
  commentMinLength: number
  confirmLabel: string
  confirmVariant: 'default' | 'destructive'
}> = {
  approve: {
    title: 'Approve request',
    description: 'This request will be approved and routed to the next level (or fully approved if this is the final level).',
    commentLabel: 'Comment (optional)',
    commentPlaceholder: 'Add a comment for the requester…',
    commentRequired: false,
    commentMinLength: 0,
    confirmLabel: 'Approve',
    confirmVariant: 'default',
  },
  reject: {
    title: 'Reject request',
    description: 'The requester will be notified with the reason you provide. This action cannot be undone.',
    commentLabel: 'Reason for rejection (required)',
    commentPlaceholder: 'Explain why this request is being rejected…',
    commentRequired: true,
    commentMinLength: 10,
    confirmLabel: 'Reject',
    confirmVariant: 'destructive',
  },
  request_info: {
    title: 'Request more information',
    description: 'The request will be paused and the requester will be asked to provide the information below.',
    commentLabel: 'What information do you need? (required)',
    commentPlaceholder: 'Describe what additional information is required…',
    commentRequired: true,
    commentMinLength: 1,
    confirmLabel: 'Send request',
    confirmVariant: 'default',
  },
}

export function ApprovalActionDialog({
  action,
  requestRef,
  onConfirm,
  onClose,
}: ApprovalActionDialogProps) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = action !== null
  const cfg = action ? CONFIG[action] : null

  function handleClose() {
    if (submitting) return
    setComment('')
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!cfg) return

    if (cfg.commentRequired && comment.trim().length < cfg.commentMinLength) {
      setError(
        action === 'reject'
          ? 'Rejection reason must be at least 10 characters.'
          : 'This field is required.'
      )
      return
    }

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
        {cfg && (
          <>
            <DialogHeader>
              <DialogTitle>{cfg.title}</DialogTitle>
              <DialogDescription>
                <span className="font-mono text-xs text-slate-500">{requestRef}</span>
                {' — '}
                {cfg.description}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <Label htmlFor="action-comment" className="text-sm font-medium text-slate-700">
                {cfg.commentLabel}
              </Label>
              <Textarea
                id="action-comment"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={cfg.commentPlaceholder}
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
              <Button
                variant={cfg.confirmVariant}
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cfg.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
