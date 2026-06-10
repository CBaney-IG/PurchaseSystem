'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface RequestDetailActionsProps {
  requestId: string
  canCancel: boolean
}

export function RequestDetailActions({ requestId, canCancel }: RequestDetailActionsProps) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/requests/${requestId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? 'Failed to cancel')
      }
      router.push('/requests')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCancelling(false)
    }
  }

  if (!canCancel) return null

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
        Cancel request
      </Button>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription>
              This will cancel the request. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Keep request
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
