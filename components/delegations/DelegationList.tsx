'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DelegationWithProfiles {
  id: string
  delegator: { id: string; full_name: string; email: string }
  delegate: { id: string; full_name: string; email: string }
  valid_from: string
  valid_until: string
  reason: string | null
  active: boolean
}

interface DelegationListProps {
  delegations: DelegationWithProfiles[]
  currentUserId: string
}

function delegationStatus(d: DelegationWithProfiles): 'active' | 'upcoming' | 'expired' | 'cancelled' {
  if (!d.active) return 'cancelled'
  const now = new Date()
  const from = new Date(d.valid_from)
  const until = new Date(d.valid_until)
  if (now < from) return 'upcoming'
  if (now > until) return 'expired'
  return 'active'
}

const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  upcoming: { label: 'Upcoming', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DelegationList({ delegations, currentUserId }: DelegationListProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState<string | null>(null)

  if (delegations.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No delegations found.
      </div>
    )
  }

  async function handleCancel(delegationId: string) {
    setCancelling(delegationId)
    await fetch('/api/admin/delegations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegation_id: delegationId }),
    })
    setCancelling(null)
    router.refresh()
  }

  return (
    <div className="space-y-3" data-testid="delegation-list">
      {delegations.map((d) => {
        const status = delegationStatus(d)
        const { label, variant } = statusBadge[status]
        const isOwner = d.delegator.id === currentUserId
        const canCancel = isOwner && (status === 'active' || status === 'upcoming')

        return (
          <div
            key={d.id}
            className="flex items-start justify-between rounded-lg border p-4"
            data-testid="delegation-row"
          >
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span className="font-medium">
                  {isOwner
                    ? `Delegated to ${d.delegate.full_name}`
                    : `Delegated from ${d.delegator.full_name}`}
                </span>
              </div>
              <div className="text-muted-foreground">
                {fmtDate(d.valid_from)} → {fmtDate(d.valid_until)}
              </div>
              {d.reason && (
                <div className="text-muted-foreground">{d.reason}</div>
              )}
            </div>

            {canCancel && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={cancelling === d.id}>
                    {cancelling === d.id ? 'Cancelling…' : 'Cancel'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel delegation?</DialogTitle>
                    <DialogDescription>
                      This will immediately stop routing approvals to{' '}
                      <strong>{d.delegate.full_name}</strong>. You will resume receiving
                      approval requests directly.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost">Keep</Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancel(d.id)}
                    >
                      Cancel delegation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )
      })}
    </div>
  )
}
