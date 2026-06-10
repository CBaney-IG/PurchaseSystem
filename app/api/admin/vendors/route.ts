import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listVendors, createVendor, updateVendor, importVendors } from '@/lib/data/vendors'
import { apiSuccess, apiError } from '@/types/api'

const VENDOR_STATUSES = ['active', 'inactive', 'pending'] as const

const createSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  category: z.string().min(1, 'Category is required'),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email('Invalid email').nullable().optional(),
  preferred: z.boolean().optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email('Invalid email').nullable().optional(),
  preferred: z.boolean().optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
})

const importRowSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  preferred: z.boolean().optional(),
})

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1),
})

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const vendors = await listVendors({ includeInactive })
    return NextResponse.json(apiSuccess(vendors))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Failed to fetch vendors', 'FETCH_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['procurement_officer', 'admin', 'group_admin'].includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
  }

  const body = await request.json()

  // Bulk import
  if (body.rows !== undefined) {
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }
    try {
      const result = await importVendors(caller.entity_id, parsed.data.rows)
      return NextResponse.json(apiSuccess(result), { status: 201 })
    } catch (err) {
      return NextResponse.json(
        apiError(err instanceof Error ? err.message : 'Import failed', 'IMPORT_ERROR'),
        { status: 500 }
      )
    }
  }

  // Single create
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  try {
    const vendor = await createVendor({ ...parsed.data, entity_id: caller.entity_id })
    return NextResponse.json(apiSuccess(vendor), { status: 201 })
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Create failed', 'CREATE_ERROR'),
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) {
    return NextResponse.json(apiError('Unauthenticated', 'UNAUTHENTICATED'), { status: 401 })
  }
  if (!['procurement_officer', 'admin', 'group_admin'].includes(caller.role)) {
    return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
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
    const vendor = await updateVendor(id, params)
    return NextResponse.json(apiSuccess(vendor))
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Update failed', 'UPDATE_ERROR'),
      { status: 500 }
    )
  }
}
