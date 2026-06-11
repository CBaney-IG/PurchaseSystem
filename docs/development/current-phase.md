# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 4 — POs, Budget Engine & Dashboard (F-013 remaining)
**Phase goal:** Full downstream flow from approved PR to PO; real-time budget tracking; unified dashboard.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |

## Last Session Summary

**Date:** 2026-06-11
**What was done:**
- F-012 complete: Budget engine
  - `lib/data/budgets.ts` — `updateCommitted(costCentreId, category, year, delta)` with `UpdateCommittedResult` (newCommitted, budgetAmount, utilisationPct, isNearLimit)
  - `lib/data/spend-requests.ts` — `submitRequest` now increments committed on submit (fire-and-forget); `cancelRequest` decrements committed when cancelling a pending_l1 request; `trackBudgetIncrement` private helper dispatches 90% budget alert to budget owner + finance users
  - `lib/approvals/processApproval.ts` — decrements committed on rejection (fire-and-forget, step 7a)
  - `emails/BudgetWarning.tsx` — React Email template with amber styling; shows committed %, budget amount, remaining
  - `lib/notifications/send.ts` — `sendBudgetWarning()` added; sends to budget owner + all finance users; stub mode support
  - 23 new tests; 275 total passing

**What's next:**
- F-013 (Dashboard) — READY; depends on F-009 ✅ and F-012 ✅

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migrations to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — get real key from resend.com; replace re_stub placeholder in .env.local
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-11 | F-011 complete. PO generation wired into processApproval, PO list + detail pages, status update Server Action. 252 tests passing. | PO generation is fire-and-forget; idempotency guard prevents duplicate POs; isValidPOTransition enforces closed/cancelled as terminal; issued_at auto-set when transitioning to issued |
| 2026-06-11 | F-009 + F-010 complete. Approver inbox UI, email notifications, email-action JWT route. 216 tests passing. | Reject-via-email uses GET→form→POST flow (can't embed reason in a link); stub mode via re_stub prefix on RESEND_API_KEY; jti stored in webhook_logs for single-use enforcement |
| 2026-06-10 | F-008 complete. Approval engine, 5 API routes, 164 tests passing. | processApproval is the single write path for all status transitions; approval_events are insert-only via service role; levels 4-6 cap to pending_l3 status while current_level tracks real number |
| 2026-06-10 | F-007 complete. Expense claim form, receipt upload, 139 tests passing. | Receipt upload uses client-side FileReader for image preview; capture="environment" for mobile camera; title auto-derived from vendor_name+category; Phase 1 OCR = manual entry with receipt preview only |
| 2026-06-10 | F-006 complete. PR form, My Requests, detail page. 116 tests passing. | Drafts use DRAFT-{uuid} temp ref; real sequential ref generated at submit; uploadAttachment uses server-side ArrayBuffer via service role; Command+Popover for vendor combobox |
| 2026-06-10 | F-005 complete. All 4 master data screens built. 91 tests passing. | Client-side CSV via papaparse; BudgetWithCostCentre uses Omit<Budget> intersection to avoid interface extension conflict |
| 2026-06-10 | F-004 complete. Admin UI for users + entities. shadcn/ui wired up. 36 tests passing. | Tailwind v4 requires @theme block for CSS variable → utility class mapping; service role only in lib/data layer |
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
