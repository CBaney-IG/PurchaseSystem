import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listEntities } from '@/lib/data/entities'
import { EntitiesAdminClient } from './EntitiesAdminClient'

export default async function AdminEntitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!caller || caller.role !== 'group_admin') {
    redirect('/dashboard')
  }

  const entities = await listEntities()

  return <EntitiesAdminClient initialEntities={entities} callerRole={caller.role} />
}
