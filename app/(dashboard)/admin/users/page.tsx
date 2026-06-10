import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listUsers } from '@/lib/data/users'
import { listEntities } from '@/lib/data/entities'
import { UsersAdminClient } from './UsersAdminClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  if (!caller || !['admin', 'group_admin'].includes(caller.role)) {
    redirect('/dashboard')
  }

  const [users, entities] = await Promise.all([listUsers(), listEntities()])

  return (
    <UsersAdminClient
      initialUsers={users}
      entities={entities}
      callerRole={caller.role}
      callerEntityId={caller.entity_id}
    />
  )
}
