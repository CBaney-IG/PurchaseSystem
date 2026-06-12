import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  listMyDelegations,
  createDelegation,
  cancelDelegation,
} from '@/lib/data/delegations'
import { sendDelegationNotification } from '@/lib/notifications/send'

const APPROVER_ROLES = [
  'approver_l1', 'approver_l2', 'approver_l3',
  'procurement_officer', 'admin', 'group_admin',
]

async function getAuthenticatedProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single()

  return profile
}

// GET /api/admin/delegations — list my delegations (outgoing + incoming)
export async function GET() {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const delegations = await listMyDelegations()
  return NextResponse.json({ data: delegations, error: null })
}

const createSchema = z.object({
  delegate_id: z.string().uuid(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  reason: z.string().max(500).optional().nullable(),
})

// POST /api/admin/delegations — create a delegation
export async function POST(req: NextRequest) {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!APPROVER_ROLES.includes(profile.role as string)) {
    return NextResponse.json(
      { error: 'Only approvers can create delegations' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { delegate_id, valid_from, valid_until, reason } = parsed.data

  // Fetch delegate profile for notification
  const supabase = await createClient()
  const { data: delegateProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', delegate_id)
    .single()

  if (!delegateProfile) {
    return NextResponse.json({ error: 'Delegate user not found' }, { status: 400 })
  }

  let result: { id: string }
  try {
    result = await createDelegation({
      delegatorId: profile.id,
      delegateId: delegate_id,
      validFrom: valid_from,
      validUntil: valid_until,
      reason: reason ?? null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create delegation' },
      { status: 400 }
    )
  }

  // Format dates for email
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
    })

  sendDelegationNotification({
    delegator: { email: profile.email as string, full_name: profile.full_name as string },
    delegate: { email: delegateProfile.email as string, full_name: delegateProfile.full_name as string },
    validFrom: fmt(valid_from),
    validUntil: fmt(valid_until),
    reason: reason ?? null,
  }).catch(err => console.error('[delegation] notification failed:', err))

  return NextResponse.json({ data: { id: result.id }, error: null }, { status: 201 })
}

const deleteSchema = z.object({
  delegation_id: z.string().uuid(),
})

// DELETE /api/admin/delegations — cancel a delegation
export async function DELETE(req: NextRequest) {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'delegation_id is required' }, { status: 400 })
  }

  try {
    await cancelDelegation(parsed.data.delegation_id, profile.id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel delegation' },
      { status: 400 }
    )
  }

  return NextResponse.json({ data: { cancelled: true }, error: null })
}
