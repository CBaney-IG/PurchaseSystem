# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 1 — Foundation (in progress)
**Phase goal:** Project scaffolding, auth, full database schema with RLS, user/entity admin UI. Nothing user-facing beyond auth.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |

## Last Session Summary

**Date:** 2026-06-10
**What was done:**
- F-004 complete: User & entity management admin UI
  - `supabase/migrations/20260610000001_entity_active.sql` — added `active` + `updated_at` columns to entities table
  - `lib/data/users.ts` — listUsers, inviteUser, updateUser, countPendingApprovals (session client for reads, service client for writes)
  - `lib/data/entities.ts` — listEntities, createEntity, updateEntity
  - `app/api/admin/users/route.ts` — GET/POST/PATCH with Zod validation and role-scoped access
  - `app/api/admin/entities/route.ts` — GET/POST/PATCH, group_admin only
  - `components/admin/InviteUserForm.tsx` — invite dialog with entity + role selection
  - `components/admin/UserTable.tsx` — inline role change, deactivation with pending-approval guard
  - `components/admin/EntityForm.tsx` — create/edit entity dialog
  - `app/(dashboard)/admin/users/` — Server Component page + UsersAdminClient
  - `app/(dashboard)/admin/entities/` — Server Component page + EntitiesAdminClient
  - `components.json` + 11 shadcn/ui components installed
  - `app/globals.css` updated with `@theme` block for Tailwind v4 CSS variable mapping
  - 23 new unit tests (13 users + 10 entities), all passing; 36 total across 3 suites
- Deactivation guard: PATCH /api/admin/users returns 409 PENDING_APPROVALS if user has pending approvals
- "Invited" user status display deferred (requires auth admin metadata merge) — no blocking AC
- Audit log entries for admin config changes deferred to F-015

**What's next:**
- F-004 branch ready to PR (feature/F-004)
- F-002 (Azure AD SSO) — still BLOCKED waiting on IT Director credentials
- F-005 (Master data admin screens) — READY to start once F-004 is merged

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migration to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-10 | F-004 complete. Admin UI for users + entities. shadcn/ui wired up. 36 tests passing. | Tailwind v4 requires @theme block for CSS variable → utility class mapping; service role only in lib/data layer |
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
