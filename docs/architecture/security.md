# Security Requirements

> **Status:** Draft — reviewed during `/init-architecture`.
> Aligned with ISO 27001 controls relevant to a web application MVP.

## Authentication

- **Provider:** Supabase Auth
- **Methods:** [Email/password, OAuth providers — specify after init]
- **Session management:** HTTP-only cookies (Supabase default with SSR)
- **Password policy:** Minimum 8 characters (Supabase default, configurable)
- **MFA:** Not required for MVP, document as Phase 2 enhancement

## Authorization

- **Model:** Role-based access control (RBAC) via user roles in profiles table
- **Enforcement:** Row Level Security (RLS) policies on all tables
- **Principle:** Least privilege — users can only access their own data unless role permits otherwise
- **Verification:** Every new table MUST have RLS enabled and policies documented

## Data Protection

### Data Classification
| Classification | Examples | Handling |
|---------------|----------|----------|
| Public | Marketing content, public profiles | No restrictions |
| Internal | User-generated content | Auth required, RLS enforced |
| Confidential | Email addresses, personal data | Auth + role check, encrypted at rest |
| Restricted | Passwords, API keys | Never stored in application code |

### Encryption
- **At rest:** Supabase encrypts PostgreSQL data at rest (AES-256)
- **In transit:** HTTPS enforced on all environments (Vercel default)
- **Secrets:** Environment variables only, never committed to git

## Input Validation

- All user inputs validated on server side (never trust client-only validation)
- Use Zod schemas for runtime validation of form data and API inputs
- Parameterized queries only — never interpolate user input into SQL

## Security Headers

Configure in `next.config.js`:
- Content-Security-Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)

## Audit Logging

For MVP, log:
- Authentication events (sign up, sign in, sign out, failed attempts)
- Authorization failures (access denied events)
- Data mutations on sensitive tables

Use Supabase's built-in auth logs + custom logging for application events.

## Incident Response (Lightweight for MVP)

1. **Detect:** Monitor Vercel logs and Supabase dashboard for anomalies
2. **Contain:** Ability to disable user accounts via admin role
3. **Document:** Log incidents in a dedicated doc (create when needed)
4. **Review:** Post-incident review to update security controls

## ISO 27001 Control Mapping

| Control | Area | MVP Status | Notes |
|---------|------|------------|-------|
| A.8.1 | Asset inventory | ✅ Documented | Tech stack and data in architecture docs |
| A.8.2 | Data classification | ✅ Documented | See table above |
| A.9.1 | Access control policy | ✅ Implemented | RBAC via RLS |
| A.9.2 | User access management | ✅ Implemented | Supabase Auth |
| A.9.4 | System access control | ✅ Implemented | Auth + RLS |
| A.10.1 | Cryptographic controls | ✅ Default | Supabase + Vercel HTTPS |
| A.12.4 | Logging and monitoring | 🔶 Partial | Auth logs yes, app logs Phase 2 |
| A.14.1 | Security requirements | ✅ Documented | This document |
| A.14.2 | Secure development | ✅ Process | Validation workflow, security skill |
| A.14.3 | Test data | 🔶 Partial | No production data in dev environments |

## Future Enhancements (Post-MVP)

- [ ] MFA enforcement for admin roles
- [ ] Rate limiting on API endpoints
- [ ] SIEM integration for centralized logging
- [ ] Penetration testing
- [ ] SOC 2 Type II preparation
- [ ] Data Processing Agreement (DPA) template
