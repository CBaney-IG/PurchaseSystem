import { SignJWT, jwtVerify } from 'jose'
import { createServiceClient } from '@/lib/supabase/service'

export interface EmailActionTokenPayload {
  requestId: string
  approverId: string
  action: 'approve' | 'reject'
  jti: string
}

function getSecret(): Uint8Array {
  const raw = process.env.EMAIL_ACTION_SECRET
  if (!raw) throw new Error('EMAIL_ACTION_SECRET environment variable is not set')
  return new TextEncoder().encode(raw)
}

export async function signEmailToken(
  payload: Omit<EmailActionTokenPayload, 'jti'>
): Promise<string> {
  const jti = crypto.randomUUID()
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h')
    .sign(getSecret())
}

export type TokenVerifyResult =
  | { valid: true; payload: EmailActionTokenPayload }
  | { valid: false; reason: 'expired' | 'invalid' | 'consumed' }

export async function verifyEmailToken(token: string): Promise<TokenVerifyResult> {
  let payload: EmailActionTokenPayload
  try {
    const { payload: raw } = await jwtVerify(token, getSecret())
    payload = raw as unknown as EmailActionTokenPayload
  } catch (err) {
    const isExpiry =
      err instanceof Error &&
      (err.message.includes('exp') || err.message.toLowerCase().includes('expired'))
    return { valid: false, reason: isExpiry ? 'expired' : 'invalid' }
  }

  // Single-use check: look for a consumed record with this jti
  const service = createServiceClient()
  const { data } = await service
    .from('webhook_logs')
    .select('id')
    .eq('webhook_type', 'email_action_token')
    .eq('status', 'sent')
    .contains('payload', { jti: payload.jti })
    .maybeSingle()

  if (data) {
    return { valid: false, reason: 'consumed' }
  }

  return { valid: true, payload }
}

export async function markTokenConsumed(payload: EmailActionTokenPayload): Promise<void> {
  const service = createServiceClient()
  await service.from('webhook_logs').insert({
    webhook_type: 'email_action_token',
    payload: { jti: payload.jti, requestId: payload.requestId, action: payload.action },
    status: 'sent',
    attempts: 1,
    sent_at: new Date().toISOString(),
  })
}
