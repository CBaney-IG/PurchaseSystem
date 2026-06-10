import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listMyRequests, createDraft } from '@/lib/data/spend-requests'
import { apiSuccess, apiError } from '@/types/api'

const SPEND_TYPES = ['purchase_request', 'expense_claim'] as const
const PRIORITIES = ['normal', 'urgent'] as const

const createDraftSchema = z
  .object({
    type: z.enum(SPEND_TYPES),
    title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
    category: z.string().min(1, 'Category is required'),
    cost_centre_id: z.string().uuid('Select a cost centre'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    description: z.string().min(20, 'Description must be at least 20 characters').nullable().optional(),
    justification: z.string().nullable().optional(),
    vendor_id: z.string().uuid().nullable().optional(),
    vendor_name: z.string().nullable().optional(),
    project_code: z.string().nullable().optional(),
    required_by: z.string().nullable().optional(),
    priority: z.enum(PRIORITIES).optional().default('normal'),
  })
  .superRefine((data, ctx) => {
    if (data.amount > 5000 && (!data.justification || data.justification.length < 50)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Justification must be at least 50 characters for amounts over R5,000',
        path: ['justification'],
      })
    }
  })

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
  const opts = {
    type: (searchParams.get('type') as (typeof SPEND_TYPES)[number] | null) ?? undefined,
    status: searchParams.get('status') ?? undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  }

  try {
    const result = await listMyRequests(opts)
    return NextResponse.json(apiSuccess(result))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch requests', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }

  const body = await request.json()
  const parsed = createDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const draft = await createDraft({
      ...parsed.data,
      entity_id: caller.entity_id,
      requester_id: caller.id,
    })
    return NextResponse.json(apiSuccess(draft), { status: 201 })
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to create draft', 'CREATE_ERROR'),
      { status: 500 }
    )
  }
}
