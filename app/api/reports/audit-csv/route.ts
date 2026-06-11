import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuditLog } from '@/lib/data/reports'

const ALLOWED_ROLES = ['admin', 'group_admin', 'procurement_officer', 'finance']

function escapeCsv(value: string | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('dateFrom') ?? undefined
  const dateTo = url.searchParams.get('dateTo') ?? undefined
  const documentType = url.searchParams.get('documentType') ?? undefined
  const action = url.searchParams.get('action') ?? undefined

  // Fetch up to 10,000 rows for export
  const { data } = await getAuditLog({ dateFrom, dateTo, documentType, action, limit: 10000, page: 1 })

  const COLUMNS = [
    'log_id', 'request_id', 'reference_no', 'document_type',
    'actor_id', 'actor_name', 'action',
    'previous_state', 'new_state', 'comment', 'timestamp_utc',
  ]

  const rows = data.map(e =>
    [
      e.id,
      e.request_id,
      e.reference_no,
      e.request_type,
      e.actor_id,
      e.actor_name,
      e.action,
      e.previous_status ?? '',
      e.new_status ?? '',
      e.comment ?? '',
      e.created_at,
    ]
      .map(escapeCsv)
      .join(',')
  )

  const csv = [COLUMNS.join(','), ...rows].join('\r\n')
  const today = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit_log_${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
