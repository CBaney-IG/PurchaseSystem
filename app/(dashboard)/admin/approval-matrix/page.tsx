import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listMatrix, listDistinctCategories } from '@/lib/data/approval-matrix'
import { ApprovalMatrixAdminClient } from './ApprovalMatrixAdminClient'

export default async function ApprovalMatrixAdminPage() {
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

  const [matrix, categories] = await Promise.all([
    listMatrix(),
    listDistinctCategories(),
  ])

  return (
    <ApprovalMatrixAdminClient
      initialMatrix={matrix}
      categories={categories}
      callerRole={caller.role}
    />
  )
}
