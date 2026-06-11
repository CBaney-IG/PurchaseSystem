import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkEscalations } from '@/lib/escalation/checkEscalations'

function webhookSecretValid(req: NextRequest): boolean {
  const secret = process.env.SNOWFLAKE_WEBHOOK_SECRET
  if (!secret) return false
  return req.headers.get('x-webhook-secret') === secret
}

export async function GET(req: NextRequest) {
  const isWebhook = webhookSecretValid(req)

  if (!isWebhook) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'group_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const report = await checkEscalations()

  return NextResponse.json({
    ok: true,
    report,
    checkedAt: new Date().toISOString(),
  })
}
