'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, UserX, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { Profile, UserRole } from '@/types/domain'

const ROLE_LABELS: Record<UserRole, string> = {
  requester: 'Requester',
  approver_l1: 'Approver L1',
  approver_l2: 'Approver L2',
  approver_l3: 'Approver L3',
  procurement_officer: 'Procurement Officer',
  finance: 'Finance',
  admin: 'Admin',
  group_admin: 'Group Admin',
}

interface Props {
  users: Profile[]
  showEntity?: boolean
  onRefresh: () => void
}

export function UserTable({ users, showEntity = false, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition()
  const [deactivateTarget, setDeactivateTarget] = useState<Profile | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [pendingApprovalWarning, setPendingApprovalWarning] = useState<string | null>(null)

  async function handleRoleChange(userId: string, role: UserRole) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, role }),
    })
    if (res.ok) {
      startTransition(() => onRefresh())
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivateError(null)
    setPendingApprovalWarning(null)

    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deactivateTarget.id, active: false }),
    })
    const json = await res.json()

    if (!res.ok) {
      if (json.error?.code === 'PENDING_APPROVALS') {
        setPendingApprovalWarning(json.error.message)
      } else {
        setDeactivateError(json.error?.message ?? 'Failed to deactivate user')
      }
      return
    }

    setDeactivateTarget(null)
    startTransition(() => onRefresh())
  }

  async function handleReactivate(userId: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, active: true }),
    })
    startTransition(() => onRefresh())
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No users found</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            {showEntity && <TableHead>Entity</TableHead>}
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className={!user.active ? 'opacity-60' : ''}>
              <TableCell className="font-medium">{user.full_name}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              {showEntity && (
                <TableCell className="text-muted-foreground">
                  {(user.entity as { name?: string } | undefined)?.name ?? '—'}
                </TableCell>
              )}
              <TableCell>
                <Select
                  defaultValue={user.role}
                  onValueChange={(role) => handleRoleChange(user.id, role as UserRole)}
                  disabled={isPending || !user.active}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.active ? 'default' : 'secondary'}
                  className={
                    user.active
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : 'bg-slate-100 text-slate-600'
                  }
                >
                  {user.active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">User actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.active ? (
                      <>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            setDeactivateError(null)
                            setPendingApprovalWarning(null)
                            setDeactivateTarget(user)
                          }}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleReactivate(user.id)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Deactivate confirmation dialog */}
      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null)
            setDeactivateError(null)
            setPendingApprovalWarning(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate user</DialogTitle>
            <DialogDescription>
              {deactivateTarget?.full_name} will no longer be able to log in or approve requests.
              Their historical actions remain visible in all audit trails.
            </DialogDescription>
          </DialogHeader>

          {pendingApprovalWarning && (
            <Alert variant="destructive">
              <AlertDescription>{pendingApprovalWarning}</AlertDescription>
            </Alert>
          )}
          {deactivateError && (
            <Alert variant="destructive">
              <AlertDescription>{deactivateError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={!!pendingApprovalWarning}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
