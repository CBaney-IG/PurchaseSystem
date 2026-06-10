import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listCostCentres } from '@/lib/data/cost-centres'
import { CostCentresAdminClient } from './CostCentresAdminClient'

export default async function CostCentresAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  if (!caller || !['finance', 'admin', 'group_admin'].includes(caller.role)) {
    redirect('/dashboard')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('active', true)
    .order('full_name')

  const costCentres = await listCostCentres({ includeInactive: true })

  return (
    <CostCentresAdminClient
      initialCostCentres={costCentres}
      profiles={profiles ?? []}
      callerRole={caller.role}
    />
  )
}
