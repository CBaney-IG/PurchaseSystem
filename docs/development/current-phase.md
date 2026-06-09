# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 1 — Foundation (in progress)
**Phase goal:** Project scaffolding, auth, full database schema with RLS, user/entity admin UI. Nothing user-facing beyond auth.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |
| F-004 | User & entity management admin UI | — | 📋 Ready | Can start — F-003 complete |

## Last Session Summary

**Date:** 2026-06-09
**What was done:**
- Connected project to Supabase cloud project (otjyioljufgcccgsdiuk) via `supabase link` + `.env.local`
- F-003 complete: 5 migration files pushed to cloud Supabase
  - `20260609000001_full_schema.sql` — 11 remaining tables (cost_centres, budgets, vendors, approval_matrices, spend_requests, attachments, approval_events, purchase_orders, delegations, notifications, webhook_logs)
  - `20260609000002_rls_policies.sql` — All RLS policies with entity isolation
  - `20260609000003_triggers.sql` — updated_at triggers for all mutable tables
  - `20260609000004_indexes.sql` — 17 performance indexes including partial indexes
  - `20260609000005_seed_categories.sql` — DEFAULT entity + 8 spend categories × 3 levels = 24 DOA matrix rows
- `lib/approvals/matrix.ts` — `getRequiredLevels` / `getNextRequiredLevel` helpers for DOA logic
- `lib/approvals/matrix.test.ts` — 13 Vitest unit tests, all passing (including AC-02)
- Fixed TypeScript strict-mode errors in F-001 Supabase SSR cookie handlers

**What's next:**
- F-002 (Azure AD SSO) — BLOCKED waiting on IT Director credentials
- F-004 (User & entity management admin UI) — READY to start

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Supabase staging/production projects — create at supabase.com before Vercel setup
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
