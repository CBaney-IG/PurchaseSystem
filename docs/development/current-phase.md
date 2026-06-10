# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 3 — Approval Engine & Inbox (in progress)
**Phase goal:** Requests route through approvers, with full status tracking.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |

## Last Session Summary

**Date:** 2026-06-10
**What was done:**
- F-008 complete: Approval engine
  - `lib/approvals/processApproval.ts` — core state machine; approve/reject/info_requested/info_provided; calls `getNextRequiredLevel` for routing; inserts immutable `approval_event` on every action
  - `lib/approvals/processApproval.test.ts` — 25 tests: levelToStatus, statusToLevel, status-transition guards, all four API body Zod schemas
  - `app/api/approvals/[id]/approve` — POST; approver-role + entity check
  - `app/api/approvals/[id]/reject` — POST; mandatory comment (min 10 chars)
  - `app/api/approvals/[id]/request-info` — POST; requires question comment
  - `app/api/approvals/[id]/provide-info` — POST; requester-only; returns request to pending_lX
  - `app/api/approvals/inbox` — GET; pending requests scoped to caller's approver level; filterable by category/amount
  - 164 tests passing across 11 suites; build clean (5 new routes)

**What's next:**
- F-009 (Approver inbox UI) — READY to start; F-008 merged to main
- F-010 (Email notifications) — depends on F-008 ✅; can run after F-009

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migrations to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-10 | F-008 complete. Approval engine, 5 API routes, 164 tests passing. | processApproval is the single write path for all status transitions; approval_events are insert-only via service role; levels 4-6 cap to pending_l3 status while current_level tracks real number |
| 2026-06-10 | F-007 complete. Expense claim form, receipt upload, 139 tests passing. | Receipt upload uses client-side FileReader for image preview; capture="environment" for mobile camera; title auto-derived from vendor_name+category; Phase 1 OCR = manual entry with receipt preview only |
| 2026-06-10 | F-006 complete. PR form, My Requests, detail page. 116 tests passing. | Drafts use DRAFT-{uuid} temp ref; real sequential ref generated at submit; uploadAttachment uses server-side ArrayBuffer via service role; Command+Popover for vendor combobox |
| 2026-06-10 | F-005 complete. All 4 master data screens built. 91 tests passing. | Client-side CSV via papaparse; BudgetWithCostCentre uses Omit<Budget> intersection to avoid interface extension conflict |
| 2026-06-10 | F-004 complete. Admin UI for users + entities. shadcn/ui wired up. 36 tests passing. | Tailwind v4 requires @theme block for CSS variable → utility class mapping; service role only in lib/data layer |
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
