import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listBudgets } from '@/lib/data/budgets'
import { listCostCentres } from '@/lib/data/cost-centres'
import { BudgetsAdminClient } from './BudgetsAdminClient'

export default async function BudgetsAdminPage() {
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

  const currentYear = new Date().getFullYear()
  const [budgets, costCentres] = await Promise.all([
    listBudgets({ year: currentYear }),
    listCostCentres({ includeInactive: false }),
  ])

  return (
    <BudgetsAdminClient
      initialBudgets={budgets}
      costCentres={costCentres}
      defaultYear={currentYear}
      callerRole={caller.role}
    />
  )
}
