import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalInbox } from '@/components/approvals/ApprovalInbox'

const APPROVER_ROLES = [
  'approver_l1',
  'approver_l2',
  'approver_l3',
  'procurement_officer',
  'finance',
  'admin',
  'group_admin',
]

const ROLE_LABEL: Record<string, string> = {
  approver_l1: 'L1 approvals',
  approver_l2: 'L2 approvals',
  approver_l3: 'L3 approvals',
  procurement_officer: 'All pending approvals',
  finance: 'All pending approvals',
  admin: 'All pending approvals',
  group_admin: 'All pending approvals',
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (!APPROVER_ROLES.includes(profile.role)) {
    redirect('/dashboard')
  }

  const scopeLabel = ROLE_LABEL[profile.role] ?? 'Pending approvals'

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">{scopeLabel} — sorted by urgency then age</p>
        </div>

        <ApprovalInbox />
      </div>
    </div>
  )
}
