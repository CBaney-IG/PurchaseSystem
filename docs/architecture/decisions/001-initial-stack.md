# ADR-001: Initial Technology Stack

**Date:** 2026-06-01
**Status:** Accepted
**Deciders:** Head of Projects & Procurement, Senior Developer

---

## Context

The Unified Spend Management Platform (USMP) must be built and deployed within 90 days by a team of 1 senior developer and 1 platform admin. It must serve ~4,000 staff across multiple BPO Group entities, integrate with Azure AD for identity, and push spend data to an existing Snowflake data warehouse. The platform must be maintainable by a small team without a dedicated DevOps function.

The BRS (BRS-USMP-001 §10.1) mandates the stack. This ADR documents the rationale for that mandate and records the confirmed choices.

---

## Decision

The following stack is confirmed and fixed for MVP:

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Database | Supabase — PostgreSQL 15 + RLS + Auth + Storage + Edge Functions |
| Hosting | Vercel Pro |
| Containerisation | Docker + Docker Compose |
| Source control / CI | GitHub + GitHub Actions |
| UI | shadcn/ui + Tailwind CSS v4, Slate base |
| Auth | Azure AD / Microsoft Entra ID SSO (OAuth2 via Supabase Auth). No email/password. |
| Email | Resend + React Email |
| JWT | jose |
| Server state | TanStack React Query v5 |
| Forms / Validation | React Hook Form + Zod |
| Testing | Vitest (unit) + Playwright (E2E) |
| Local dev URL | https://localhost:3003 |

---

## Rationale

### Next.js 15 over Next.js 14 or alternative frameworks

Next.js 15 is specified in the BRS. App Router Server Components reduce client-side JavaScript for a data-heavy admin tool. Built-in API routes, Server Actions, and middleware eliminate the need for a separate backend service — reducing operational complexity for a small team.

### Supabase over self-hosted PostgreSQL

Supabase provides managed PostgreSQL, built-in Row Level Security (enforced at the database layer — cannot be bypassed by application bugs), Azure AD OAuth2 support, file storage, serverless Edge Functions (for background jobs), and Database Webhooks (for the Snowflake event pipeline) — all on a single platform. For a team without a DevOps specialist, managed hosting eliminates server maintenance, certificate management, and backup configuration. Migrations are plain SQL and portable to any PostgreSQL instance if a future migration is needed.

### Azure AD SSO only — no email/password

BPO Group already operates Azure AD for all 4,000 staff. Azure AD is the single source of truth for identity. Adding a parallel password system would create an additional credential attack surface and require a password reset / help desk workflow. All staff already have Azure AD accounts — zero onboarding friction.

### Vercel Pro over self-hosted Docker

Vercel provides zero-config Next.js deployment, automatic preview URLs for every pull request (used as the staging environment), instant rollback, and no server management. The Docker configuration is maintained for local development and as a portable deployment artefact if the team ever needs to move off Vercel.

### shadcn/ui + Tailwind CSS v4

The PRD specifies shadcn/ui and Slate base colour explicitly. Radix UI primitives give WCAG 2.1 AA keyboard and screen reader support out of the box. Tailwind CSS v4 with CSS variables enables consistent theming without writing custom CSS. Only used components are included — no heavy bundle overhead.

### Resend for transactional email

Approval email links must reach recipients (approvers, requesters) who may have no platform account or active session. Supabase's built-in email is auth-only and unsuitable for this. Resend has a free tier that covers the MVP volume, first-class React Email support, and reliable deliverability.

---

## Consequences

- **Positive:** Small team can build and operate the platform without DevOps expertise. No licence fees beyond Vercel Pro and Supabase hosting.
- **Positive:** PostgreSQL RLS provides defence-in-depth — entity isolation is enforced even if application code has a bug.
- **Positive:** Migrations are plain SQL — no ORM lock-in; portable to raw PostgreSQL if needed.
- **Negative:** Supabase Edge Functions run on Deno, not Node.js — some Node-specific libraries require adaptation. Mitigated by using only standard web APIs in Edge Functions.
- **Negative:** `--experimental-https` required for local development on `https://localhost:3003` — adds a setup step. Documented in `docs/development/environments.md`.
- **Constraint:** Deviating from this stack during MVP requires an explicit new ADR and approval from the Head of Projects & Procurement.
