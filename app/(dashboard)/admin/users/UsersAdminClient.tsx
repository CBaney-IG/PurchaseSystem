'use client'

import { useState, useCallback } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { UserTable } from '@/components/admin/UserTable'
import { InviteUserForm } from '@/components/admin/InviteUserForm'
import { AdminNav } from '@/components/admin/AdminNav'
import type { Profile, Entity, UserRole } from '@/types/domain'

interface Props {
  initialUsers: Profile[]
  entities: Entity[]
  callerRole: UserRole
  callerEntityId: string
}

export function UsersAdminClient({ initialUsers, entities, callerRole, callerEntityId }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const json = await res.json()
      setUsers(json.data ?? [])
    }
  }, [])

  return (
    <div className="p-8">
      <AdminNav callerRole={callerRole} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <UserTable
          users={users}
          showEntity={callerRole === 'group_admin'}
          onRefresh={refresh}
        />
      </div>

      <InviteUserForm
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        entities={entities}
        callerRole={callerRole}
        callerEntityId={callerEntityId}
        onSuccess={refresh}
      />
    </div>
  )
}
