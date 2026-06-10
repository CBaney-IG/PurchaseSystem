import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequest, uploadAttachment } from '@/lib/data/spend-requests'
import { apiSuccess, apiError } from '@/types/api'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

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

export async function POST(request: NextRequest, { params }: { params: Params }) {
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      apiError('Invalid multipart form data', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const file = formData.get('file') as File | null
  if (!file || !file.name) {
    return NextResponse.json(apiError('No file provided', 'VALIDATION_ERROR'), { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      apiError('File type not allowed. Accepted: PDF, PNG, JPG, DOCX, XLSX', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      apiError('File too large. Maximum size is 10 MB', 'VALIDATION_ERROR'),
      { status: 400 }
    )
  }

  const buffer = await file.arrayBuffer()

  try {
    const attachment = await uploadAttachment(id, caller.entity_id, caller.id, {
      name: file.name,
      buffer,
      type: file.type,
      size: file.size,
    })
    return NextResponse.json(apiSuccess(attachment), { status: 201 })
  } catch (err) {
    return NextResponse.json(
      apiError(err instanceof Error ? err.message : 'Upload failed', 'UPLOAD_ERROR'),
      { status: 500 }
    )
  }
}
