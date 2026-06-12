# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 5 — Integrations & Reporting (F-014, F-015, F-016)
**Phase goal:** Snowflake data pipeline, audit PDF/CSV export, and auto-escalation.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |

## Last Session Summary

**Date:** 2026-06-11
**What was done:**
- F-016 complete: Auto-escalation
  - `emails/ApprovalReminder.tsx` — amber-banner reminder email with signed JWT Approve/Reject links; `hoursOverdue` prop
  - `emails/ApprovalEscalated.tsx` — red-banner escalation email; `isManager` prop drives dual messaging
  - `lib/notifications/send.ts` — added `sendApprovalReminder()` and `sendEscalationAlert()` with stub-mode support
  - `lib/escalation/checkEscalations.ts` — core cron engine: 24h reminder, 48h escalation to manager (group_admin fallback); idempotency guards; `EscalationReport` return type
  - `app/api/webhooks/escalation-check/route.ts` — GET; auth via webhook secret or admin/group_admin session
  - `lib/escalation/checkEscalations.test.ts` — 9 tests covering all branches
  - 317 total tests passing

**What's next:**
- F-014 (Snowflake integration) — READY; on branch feature/F-014 (stubbed with STUB:// mode)
- F-015 (Audit trail & reports) — READY; on branch feature/F-015
- F-015 complete: Audit trail & reports
  - `lib/data/reports.ts` — `getAuditLog()` with date/type/action filters and pagination; `getRequestForPDF()` with budget impact and sorted events
  - `lib/pdf/AuditReportDocument.tsx` — React-PDF template; sections: header, document details, budget impact, approval event timeline with status transitions, fixed footer with page numbers
  - `app/api/requests/[id]/audit-pdf/route.ts` — PDF download endpoint; accessible to requester or privileged roles; returns `Content-Disposition: attachment`
  - `app/api/reports/audit-csv/route.ts` — CSV export (up to 10k rows); restricted to admin/finance/procurement_officer/group_admin
  - `app/(dashboard)/reports/page.tsx` — audit log table with filter panel, pagination, Export CSV button
  - `components/reports/AuditLogFilters.tsx` — client component; date range, document type, action filters; syncs to URL search params
  - `app/(dashboard)/requests/[id]/page.tsx` — added Audit Report PDF download button; timeline now shows previous_status → new_status transitions
  - 11 new tests; 307 total passing

**What's next:**
- F-014 (Snowflake integration) — READY; depends on F-008 ✅

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migrations to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — get real key from resend.com; replace re_stub placeholder in .env.local
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-11 | F-016 complete. Auto-escalation: 24h reminder + 48h manager escalation engine, two email templates, escalation-check API route. 317 tests passing. | checkEscalations is a Next.js API route (not Edge Function) for local dev; idempotency via notifications + approval_events guards; non-enumerable `then` on mock chains can't be spread — use call-count tracking instead |
| 2026-06-11 | F-013 complete. Dashboard: 4 metric cards, Suspense streaming, role-based content (approver inbox vs recent requests), budget alert banner. 296 tests passing. | Async Server Components + Suspense for metric cards and request list; ApprovalInbox reused on dashboard; join cast via `as unknown as` (Supabase types join as array before type regen) |
| 2026-06-11 | F-012 complete. Budget engine — committed tracking on submit/cancel/reject, 90% alert emails. 275 tests. | Fire-and-forget pattern for budget increments/decrements; BudgetWarning email previewText must be pre-computed string (not JSX with embedded number) |
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
