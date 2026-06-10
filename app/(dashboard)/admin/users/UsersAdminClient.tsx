'use client'

import { useState, useCallback } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserTable } from '@/components/admin/UserTable'
import { InviteUserForm } from '@/components/admin/InviteUserForm'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </div>

      <UserTable
        users={users}
        showEntity={callerRole === 'group_admin'}
        onRefresh={refresh}
      />

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
