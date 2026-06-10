import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listEntities, createEntity, updateEntity } from '@/lib/data/entities'
import { apiSuccess, apiError } from '@/types/api'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, or hyphens'),
  parent_id: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  parent_id: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
})

async function requireGroupAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!data || data.role !== 'group_admin') return null
  return data
}

export async function GET() {
  const caller = await requireGroupAdmin()
  if (!caller) {
    return NextResponse.json(
      apiError('Only group_admin can manage entities', 'FORBIDDEN'),
      { status: 403 }
    )
  }

  try {
    const entities = await listEntities()
    return NextResponse.json(apiSuccess(entities))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch entities', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const caller = await requireGroupAdmin()
  if (!caller) {
    return NextResponse.json(
      apiError('Only group_admin can manage entities', 'FORBIDDEN'),
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const entity = await createEntity(parsed.data)
    return NextResponse.json(apiSuccess(entity), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    const code = message.includes('unique') ? 'DUPLICATE_CODE' : 'CREATE_ERROR'
    return NextResponse.json(apiError(message, code), { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await requireGroupAdmin()
  if (!caller) {
    return NextResponse.json(
      apiError('Only group_admin can manage entities', 'FORBIDDEN'),
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const { id, ...params } = parsed.data

  try {
    const entity = await updateEntity(id, params)
    return NextResponse.json(apiSuccess(entity))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Update failed', 'UPDATE_ERROR'),
      { status: 500 }
    )
  }
}
