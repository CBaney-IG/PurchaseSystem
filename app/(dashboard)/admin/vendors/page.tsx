import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listVendors } from '@/lib/data/vendors'
import { VendorsAdminClient } from './VendorsAdminClient'

export default async function VendorsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  if (!caller || !['procurement_officer', 'admin', 'group_admin'].includes(caller.role)) {
    redirect('/dashboard')
  }

  const vendors = await listVendors({ includeInactive: true })

  return <VendorsAdminClient initialVendors={vendors} callerRole={caller.role} />
}
