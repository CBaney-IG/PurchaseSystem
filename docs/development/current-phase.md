# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 2 — Master Data & Core Forms (in progress)
**Phase goal:** Administrators can configure the platform; requesters can submit PRs and expense claims.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |

## Last Session Summary

**Date:** 2026-06-10
**What was done:**
- F-006 complete: Purchase Requisition form
  - `supabase/migrations/20260610000002_storage_attachments.sql` — private `attachments` bucket + authenticated-read RLS policy
  - `lib/ref-number.ts` + `lib/ref-number.test.ts` — sequential PR-YYYY-NNNNN / EXP-YYYY-NNNNN generation (6 tests)
  - `lib/data/spend-requests.ts` — createDraft, updateDraft, submitRequest, listMyRequests, getRequest, cancelRequest, getBudgetPosition, uploadAttachment
  - `lib/data/spend-requests.test.ts` — 19 Zod schema + ref-number formatting tests
  - API routes: `GET+POST /api/requests`, `GET /api/requests/budget`, `GET+PATCH+DELETE /api/requests/[id]`, `POST /api/requests/[id]/submit`, `POST /api/requests/[id]/attachments`
  - Components: RequestStatusBadge, BudgetIndicator, ApprovalPathPreview, FileUpload, VendorCombobox (shadcn Command+Popover), PRForm
  - Pages: `/requests/new`, `/requests` (My Requests list), `/requests/[id]` (detail + approval timeline)
  - 116 tests passing across 9 suites; build clean

**What's next:**
- F-006 branch ready to PR (feature/F-006)
- F-007 (Expense claim form) — READY to start once F-006 is merged

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migrations to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-10 | F-006 complete. PR form, My Requests, detail page. 116 tests passing. | Drafts use DRAFT-{uuid} temp ref; real sequential ref generated at submit; uploadAttachment uses server-side ArrayBuffer via service role; Command+Popover for vendor combobox |
| 2026-06-10 | F-005 complete. All 4 master data screens built. 91 tests passing. | Client-side CSV via papaparse; BudgetWithCostCentre uses Omit<Budget> intersection to avoid interface extension conflict |
| 2026-06-10 | F-004 complete. Admin UI for users + entities. shadcn/ui wired up. 36 tests passing. | Tailwind v4 requires @theme block for CSS variable → utility class mapping; service role only in lib/data layer |
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
