import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { simulateApprovalPath } from '@/lib/data/approval-matrix'
import { apiSuccess, apiError } from '@/types/api'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('entity_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json(apiError('Profile not found', 'NOT_FOUND'), { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const amountStr = searchParams.get('amount')

  if (!category || !amountStr) {
    return NextResponse.json(
      apiError('category and amount are required', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const amount = Number(amountStr)
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      apiError('amount must be a positive number', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const path = await simulateApprovalPath(profile.entity_id, category, amount)
    return NextResponse.json(apiSuccess(path))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Simulation failed', 'SIMULATE_ERROR'),
      { status: 500 }
    )
  }
}
