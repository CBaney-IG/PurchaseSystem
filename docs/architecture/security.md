# Security Requirements

> **Status:** Active — confirmed during `/init-architecture` (June 2026)
> Aligned with ISO 27001 controls and POPIA (South Africa).

## Authentication

- **Provider:** Supabase Auth with Azure AD / Microsoft Entra ID as the OAuth2 identity provider
- **Methods:** Azure AD SSO only. Email/password auth is **disabled** in Supabase Auth settings.
- **Session management:** HTTP-only cookies (Supabase SSR default). Managed via `@supabase/ssr` middleware.
- **Session expiry:** 8 hours of inactivity — Supabase session expires and user is redirected to `/login`
- **Admin re-authentication:** Admin actions in the UI prompt for re-confirmation after 30 minutes of inactivity (implemented as a server-side session age check on admin API routes)
- **MFA:** Enforced by Azure AD for approver and admin roles — this is Azure AD policy, not application-level. Phase 2: consider Supabase MFA as an additional layer.
- **Profile provisioning:** On first login, a Supabase DB trigger creates a `profiles` row with `role = 'requester'` and the DEFAULT entity. Admin must then assign the correct entity and role.

## Authorization

- **Model:** Role-Based Access Control (RBAC) with 8 roles enforced via PostgreSQL Row Level Security
- **Roles:**

| Role | Description | Scope |
|---|---|---|
| `requester` | Submit and track own PRs and expense claims | Own entity |
| `approver_l1` | Approve/reject at L1 threshold | Own entity |
| `approver_l2` | Approve/reject at L2 threshold | Own entity |
| `approver_l3` | Approve/reject at L3 threshold | Own entity |
| `procurement_officer` | Vendor catalogue, PO management, approval matrix | Own entity |
| `finance` | Budget management, read-only across entity | Own entity |
| `admin` | User management, entity config, full read | Own entity |
| `group_admin` | All of the above + cross-entity consolidated view | All entities |

- **Enforcement:** RLS policies on every table using `get_my_entity_id()` and `get_my_role()` helper functions. RLS cannot be disabled by application bugs — it is enforced at the database layer.
- **Principle:** Least privilege. Users see only data relevant to their role and entity.
- **Service role key:** Used only in server-side API routes and Server Actions for mutations. Never passed to the browser. Never committed to source control.

## Multi-Entity Data Isolation

- Every table with an `entity_id` column carries an entity isolation RLS policy
- A user in Entity A cannot read, write, or enumerate data from Entity B — not via the UI, not via direct API calls, not via URL manipulation
- The `group_admin` role is the only role that bypasses entity isolation (consolidated reporting)
- Budget pools are entity-scoped; no cross-entity budget sharing unless the Group Admin explicitly configures shared cost centres

## Email Action Token Security

Approval email links use signed tokens to allow approvers to act without logging in:

- **Algorithm:** HMAC-SHA256 signed JWT via `jose`
- **Signing key:** `EMAIL_ACTION_SECRET` environment variable (64+ char random string, never committed)
- **Token payload:** `{ requestId, approverId, action: "approve"|"reject", iat, exp }`
- **Expiry:** 48 hours from issue
- **Single-use enforcement:** Token hash stored in `webhook_logs` on first use; second use returns "already actioned" response
- **Validation order:** signature → expiry → not-consumed → requester/approver state still valid
- **On invalid token:** Return an HTML error page (not a redirect to the app); never execute any action

## Data Protection

### Data Classification

| Classification | Examples | Handling |
|---|---|---|
| **Public** | Platform status page | No restrictions |
| **Internal** | Request titles, categories, amounts | Auth required; RLS enforced |
| **Confidential** | Employee names, emails, salary-related expense data | Auth + role check; encrypted at rest; POPIA applies |
| **Restricted** | API keys, service role key, JWT signing secret | Environment variables only; never committed; never logged |

### POPIA Compliance (Protection of Personal Information Act, South Africa)

- Personal information (employee names, email addresses, salary-related expense data) is stored only in `profiles` and `spend_requests` tables
- Data is retained for a minimum of 7 years (audit requirement) and then archived or deleted per a documented retention policy
- No personal data is transmitted to Snowflake in raw form beyond what is required for reporting (user IDs are used as foreign keys; display names only in `DIM_USERS`)
- Employees can request access to their own data via the platform (read their own `profiles` and `spend_requests`)
- Data is stored in Supabase's hosted infrastructure — confirm the Supabase region is compliant with POPIA data residency requirements before go-live

### Encryption

- **At rest:** Supabase encrypts PostgreSQL data at rest (AES-256)
- **In transit:** HTTPS enforced on all environments (Vercel enforces TLS 1.2+ by default); local dev uses `--experimental-https` flag on `next dev`
- **File attachments:** Stored in Supabase Storage; access controlled by Supabase Storage policies scoped to authenticated users with entity access
- **Secrets:** Vercel Environment Variables (production/preview); `.env.local` (local dev, gitignored). Never hardcoded.

## Input Validation

- All user inputs validated **server-side** with Zod schemas — client validation is UX only, never trusted
- Shared Zod schemas between client (form validation) and server (API/Server Action validation) in `src/types/`
- Parameterised queries only via Supabase client SDK — no raw string interpolation into SQL
- File uploads: type and size validated server-side before writing to Supabase Storage (max 10 MB, allowed types: PDF, PNG, JPG, DOCX, XLSX)
- Amount fields: validated as positive numbers with max 2 decimal places; currency locked to ZAR default

## Security Headers

Configured in `next.config.ts`:

```typescript
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // required by Next.js inline scripts
      "style-src 'self' 'unsafe-inline'",    // required by Tailwind inline styles
      "img-src 'self' data: *.supabase.co",
      "connect-src 'self' *.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
  }
]
```

## Audit Logging

Every state transition of every document (PR, PO, Expense) is recorded in `approval_events` with:
- Actor (user ID + name via join)
- Action taken
- Timestamp (UTC)
- Previous status
- New status
- Optional comment

The `approval_events` table has no UPDATE or DELETE RLS policy — no user, including `group_admin`, can modify or delete audit records. Records are retained for a minimum of 7 years.

Authentication events (sign-in, sign-out, failed attempts) are logged in Supabase Auth's built-in logs.

Admin configuration changes (DOA matrix edits, budget adjustments) are recorded in `approval_events.metadata` with the changed values.

## Webhook Security

- Supabase → USMP webhook: validated via `x-webhook-secret` header against `SNOWFLAKE_WEBHOOK_SECRET` env var
- USMP → Snowflake: bearer token auth using credentials provided by the Data team
- Both secrets are environment variables; never in source code or logs

## Incident Response

1. **Detect:** Monitor Vercel deployment logs and Supabase Dashboard for anomalies; `webhook_logs` table for integration failures
2. **Contain:** Disable user accounts via Admin > Users > Deactivate; rotate compromised secrets via Vercel dashboard
3. **Document:** Create an incident record in `docs/incidents/YYYY-MM-DD-description.md`
4. **Review:** Post-incident review within 48 hours; update security controls as needed

## ISO 27001 Control Mapping

| Control | Area | Status | Notes |
|---|---|---|---|
| A.8.1 | Asset inventory | ✅ Documented | Tech stack and data classification in this file and tech-stack.md |
| A.8.2 | Data classification | ✅ Documented | See table above |
| A.9.1 | Access control policy | ✅ Implemented | RBAC via 8 roles + RLS |
| A.9.2 | User access management | ✅ Implemented | Azure AD SSO; admin invite flow; deactivation process |
| A.9.4 | System access control | ✅ Implemented | Session auth + RLS; service role key server-only |
| A.10.1 | Cryptographic controls | ✅ Implemented | HMAC-SHA256 JWT tokens; AES-256 at rest; TLS 1.2+ in transit |
| A.12.4 | Logging and monitoring | ✅ Implemented | Immutable approval_events; Supabase auth logs; webhook_logs |
| A.14.1 | Security requirements | ✅ Documented | This document |
| A.14.2 | Secure development | ✅ Process | Code review; /security-audit skill; Zod validation; no raw SQL |
| A.14.3 | Test data | ✅ Enforced | Seed data uses fake names/emails; no production data in dev |
| A.18.1 | POPIA compliance | 🔶 In progress | Data minimisation and retention policy to be finalised before go-live |

## Post-MVP Security Enhancements

- [ ] Rate limiting on API routes (Vercel Edge middleware or Upstash)
- [ ] SIEM integration for centralised log aggregation
- [ ] Penetration testing before production go-live
- [ ] Data Processing Agreement (DPA) template for POPIA
- [ ] Supabase region confirmation for POPIA data residency
