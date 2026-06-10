import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequest, submitRequest } from '@/lib/data/spend-requests'
import { apiSuccess, apiError } from '@/types/api'

type Params = Promise<{ id: string }>

async function getCallerProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single()

  return data
}

export async function POST(_request: NextRequest, { params }: { params: Params }) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { id } = await params

  const existing = await getRequest(id)
  if (!existing) {
    return NextResponse.json(apiError('Request not found', 'NOT_FOUND'), { status: 404 })
  }

  if (existing.requester_id !== caller.id) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      apiError('Only draft requests can be submitted', 'INVALID_STATUS'),
      { status: 400 }
    )
  }

  try {
    const submitted = await submitRequest(id, caller.id)
    return NextResponse.json(apiSuccess(submitted))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Submit failed', 'SUBMIT_ERROR'),
      { status: 500 }
    )
  }
}
