import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { listMyDelegations } from '@/lib/data/delegations'
import { DelegationForm } from '@/components/delegations/DelegationForm'
import { DelegationList } from '@/components/delegations/DelegationList'

const APPROVER_ROLES = [
  'approver_l1', 'approver_l2', 'approver_l3',
  'procurement_officer', 'admin', 'group_admin',
]

const ROLE_LABELS: Record<string, string> = {
  requester: 'Requester',
  approver_l1: 'Approver L1',
  approver_l2: 'Approver L2',
  approver_l3: 'Approver L3',
  procurement_officer: 'Procurement Officer',
  finance: 'Finance',
  admin: 'Admin',
  group_admin: 'Group Admin',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department, entity_id, entities(name, code)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isApproverRole = APPROVER_ROLES.includes(profile.role as string)

  // Fetch potential delegates (other active approvers in same entity)
  const { data: potentialDelegates } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('entity_id', profile.entity_id as string)
    .in('role', APPROVER_ROLES)
    .eq('active', true)
    .neq('id', profile.id)
    .order('full_name')

  const delegations = isApproverRole ? await listMyDelegations() : []

  const entity = profile.entities as unknown as { name: string; code: string } | null

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      {/* Profile details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your identity and role within the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-y-3 text-sm">
            <span className="font-medium text-muted-foreground">Name</span>
            <span className="col-span-2">{profile.full_name as string}</span>

            <span className="font-medium text-muted-foreground">Email</span>
            <span className="col-span-2">{profile.email as string}</span>

            <span className="font-medium text-muted-foreground">Role</span>
            <span className="col-span-2">
              <Badge variant="secondary">
                {ROLE_LABELS[profile.role as string] ?? profile.role as string}
              </Badge>
            </span>

            {entity && (
              <>
                <span className="font-medium text-muted-foreground">Entity</span>
                <span className="col-span-2">{entity.name} ({entity.code})</span>
              </>
            )}

            {profile.department && (
              <>
                <span className="font-medium text-muted-foreground">Department</span>
                <span className="col-span-2">{profile.department as string}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval delegation — only shown for approver roles */}
      {isApproverRole && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Delegation</CardTitle>
            <CardDescription>
              Delegate your approval authority to a colleague for a set date range, for example
              while on leave. All approvals will route to your delegate while the delegation is
              active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold">New delegation</h3>
              <DelegationForm
                potentialDelegates={(potentialDelegates ?? []) as { id: string; full_name: string; email: string }[]}
              />
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 text-sm font-semibold">Your delegations</h3>
              <DelegationList
                delegations={delegations as Parameters<typeof DelegationList>[0]['delegations']}
                currentUserId={profile.id as string}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
