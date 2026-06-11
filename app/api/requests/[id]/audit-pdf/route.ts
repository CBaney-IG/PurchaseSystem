import { NextRequest } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getRequestForPDF } from '@/lib/data/reports'
import { AuditReportDocument } from '@/lib/pdf/AuditReportDocument'

type Params = Promise<{ id: string }>

const PRIVILEGED_ROLES = ['procurement_officer', 'finance', 'admin', 'group_admin']

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return new Response('Unauthorized', { status: 401 })

  // Check access: own request or privileged role
  const { data: sr } = await supabase
    .from('spend_requests')
    .select('requester_id')
    .eq('id', id)
    .maybeSingle()

  if (!sr) return new Response('Not found', { status: 404 })

  const isOwn = sr.requester_id === user.id
  const isPrivileged = PRIVILEGED_ROLES.includes(profile.role)
  if (!isOwn && !isPrivileged) return new Response('Forbidden', { status: 403 })

  const requestData = await getRequestForPDF(id)
  if (!requestData) return new Response('Not found', { status: 404 })

  const generatedAt = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(AuditReportDocument, { request: requestData, generatedAt }) as any
  const pdfBuffer: Buffer = await renderToBuffer(doc)

  const today = generatedAt.slice(0, 10)
  const filename = `${requestData.reference_no}_audit_${today}.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
