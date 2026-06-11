// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { SignJWT, jwtVerify } from 'jose'

// Mirror the token payload structure
interface EmailActionTokenPayload {
  requestId: string
  approverId: string
  action: 'approve' | 'reject'
  jti: string
  iat?: number
  exp?: number
}

const TEST_SECRET = 'test-secret-that-is-long-enough-to-be-valid-for-hmac-256-testing'
const secretBytes = new TextEncoder().encode(TEST_SECRET)

async function signToken(
  payload: Omit<EmailActionTokenPayload, 'iat' | 'exp'>,
  expiresIn = '48h'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretBytes)
}

async function verifyToken(
  token: string
): Promise<EmailActionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes)
    return payload as unknown as EmailActionTokenPayload
  } catch {
    return null
  }
}

// ---- Token structure tests ----

describe('email action token — sign/verify roundtrip', () => {
  it('verifies a freshly signed token', async () => {
    const token = await signToken({
      requestId: 'req-123',
      approverId: 'user-456',
      action: 'approve',
      jti: crypto.randomUUID(),
    })

    const payload = await verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.requestId).toBe('req-123')
    expect(payload?.approverId).toBe('user-456')
    expect(payload?.action).toBe('approve')
  })

  it('includes a jti claim', async () => {
    const jti = crypto.randomUUID()
    const token = await signToken({
      requestId: 'req-1',
      approverId: 'user-1',
      action: 'reject',
      jti,
    })
    const payload = await verifyToken(token)
    expect(payload?.jti).toBe(jti)
  })

  it('sets an expiry claim', async () => {
    const token = await signToken({
      requestId: 'req-1',
      approverId: 'user-1',
      action: 'approve',
      jti: crypto.randomUUID(),
    })
    const payload = await verifyToken(token)
    expect(payload?.exp).toBeDefined()
    expect(typeof payload?.exp).toBe('number')
    // exp should be ~48h from now
    const inAbout48h = Math.floor(Date.now() / 1000) + 48 * 60 * 60
    expect(payload!.exp!).toBeGreaterThan(inAbout48h - 120) // within 2 minutes
    expect(payload!.exp!).toBeLessThan(inAbout48h + 120)
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await new SignJWT({ requestId: 'req-1', approverId: 'u-1', action: 'approve', jti: 'x' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('48h')
      .sign(new TextEncoder().encode('a-completely-different-secret-that-is-long-enough'))

    const payload = await verifyToken(token)
    expect(payload).toBeNull()
  })

  it('rejects an expired token', async () => {
    const token = await signToken(
      { requestId: 'req-1', approverId: 'u-1', action: 'approve', jti: crypto.randomUUID() },
      '-1s' // already expired
    )
    const payload = await verifyToken(token)
    expect(payload).toBeNull()
  })

  it('rejects a tampered payload (manual base64 edit)', async () => {
    const token = await signToken({
      requestId: 'req-1',
      approverId: 'u-1',
      action: 'approve',
      jti: crypto.randomUUID(),
    })

    // Change a character in the payload section (second part of the JWT)
    const parts = token.split('.')
    const decoded = Buffer.from(parts[1], 'base64url').toString()
    const tampered = decoded.replace('"approve"', '"reject"')
    parts[1] = Buffer.from(tampered).toString('base64url')
    const tamperedToken = parts.join('.')

    const payload = await verifyToken(tamperedToken)
    expect(payload).toBeNull()
  })
})

// ---- jti uniqueness ----

describe('jti uniqueness', () => {
  it('each signed token has a unique jti', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 5 }, () =>
        signToken({ requestId: 'r', approverId: 'a', action: 'approve', jti: crypto.randomUUID() })
      )
    )
    const jtis = await Promise.all(tokens.map((t) => verifyToken(t).then((p) => p?.jti)))
    const unique = new Set(jtis)
    expect(unique.size).toBe(5)
  })
})

// ---- Expiry boundary logic (unit, no DB) ----

describe('expiry detection', () => {
  it('identifies an expired token via caught error', async () => {
    const token = await signToken(
      { requestId: 'r', approverId: 'a', action: 'approve', jti: 'x' },
      '-1s'
    )

    let reason: string | null = null
    try {
      await jwtVerify(token, secretBytes)
    } catch (err) {
      const isExpiry =
        err instanceof Error &&
        (err.message.includes('exp') || err.message.toLowerCase().includes('expired'))
      reason = isExpiry ? 'expired' : 'invalid'
    }

    expect(reason).toBe('expired')
  })

  it('identifies an invalid token via caught error', async () => {
    let reason: string | null = null
    try {
      await jwtVerify('this.is.not.a.valid.jwt', secretBytes)
    } catch (err) {
      const isExpiry =
        err instanceof Error &&
        (err.message.includes('exp') || err.message.toLowerCase().includes('expired'))
      reason = isExpiry ? 'expired' : 'invalid'
    }

    expect(reason).toBe('invalid')
  })
})
