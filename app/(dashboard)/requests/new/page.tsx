import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDistinctCategories } from '@/lib/data/approval-matrix'
import { listCostCentres } from '@/lib/data/cost-centres'
import { listVendors } from '@/lib/data/vendors'
import { PRForm } from '@/components/requests/PRForm'

export default async function NewRequestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [categories, costCentresResult, vendors] = await Promise.all([
    listDistinctCategories(profile.entity_id),
    listCostCentres(),
    listVendors(),
  ])

  const costCentres = costCentresResult.map((cc) => ({
    id: cc.id,
    code: cc.code,
    name: cc.name,
  }))

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">New purchase request</h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete all required fields and submit for approval.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <PRForm
            categories={categories}
            costCentres={costCentres}
            vendors={vendors}
          />
        </div>
      </div>
    </div>
  )
}
