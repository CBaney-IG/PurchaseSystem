import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBudgetPosition } from '@/lib/data/spend-requests'
import { apiSuccess, apiError } from '@/types/api'

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

export async function GET(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const costCentreId = searchParams.get('cost_centre_id')
  const category = searchParams.get('category')
  const yearStr = searchParams.get('year')

  if (!costCentreId || !category) {
    return NextResponse.json(
      apiError('cost_centre_id and category are required', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const year = yearStr ? Number(yearStr) : new Date().getFullYear()
  if (isNaN(year)) {
    return NextResponse.json(
      apiError('year must be a valid number', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const position = await getBudgetPosition(costCentreId, category, year)
    return NextResponse.json(apiSuccess(position))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch budget position', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}
