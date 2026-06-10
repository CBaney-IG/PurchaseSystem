import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!caller) redirect('/login')

  const role = caller.role

  if (['admin', 'group_admin'].includes(role)) {
    redirect('/admin/users')
  }
  if (role === 'procurement_officer') {
    redirect('/admin/vendors')
  }
  if (role === 'finance') {
    redirect('/admin/cost-centres')
  }

  redirect('/dashboard')
}
