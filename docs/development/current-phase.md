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
- F-007 complete: Expense Claim form
  - `components/expenses/ReceiptUpload.tsx` — single-file receipt upload with image preview (JPG/PNG) and PDF icon; drag-drop + click; max 10 MB; mobile `capture="environment"` for camera
  - `components/expenses/ExpenseForm.tsx` — expense claim form; vendor (free text), amount, expense date, category, cost centre, description, justification (>R5k rule); title auto-derived; reuses BudgetIndicator + ApprovalPathPreview; same confirmation dialog + draft-save pattern as PRForm
  - `app/(dashboard)/expenses/new/page.tsx` — server component; fetches categories + cost centres; renders ExpenseForm
  - `lib/data/expenses.test.ts` — 23 tests: schema validation, title derivation, receipt file validation
  - Sidebar updated: added "New Expense" link (Receipt icon) between "New Request" and "My Requests"
  - All existing API routes (`POST /api/requests`, `/[id]/attachments`, `/[id]/submit`) reused without change
  - 139 tests passing across 10 suites; lint clean, types clean, build clean

**What's next:**
- F-007 branch ready to PR/merge (feature/F-007)
- F-008 (Approval engine — processApproval(), routing logic, DOA matrix evaluation, status state machine) — READY to start once F-007 is merged

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migrations to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-10 | F-007 complete. Expense claim form, receipt upload, 139 tests passing. | Receipt upload uses client-side FileReader for image preview; capture="environment" for mobile camera; title auto-derived from vendor_name+category; Phase 1 OCR = manual entry with receipt preview only |
| 2026-06-10 | F-006 complete. PR form, My Requests, detail page. 116 tests passing. | Drafts use DRAFT-{uuid} temp ref; real sequential ref generated at submit; uploadAttachment uses server-side ArrayBuffer via service role; Command+Popover for vendor combobox |
| 2026-06-10 | F-005 complete. All 4 master data screens built. 91 tests passing. | Client-side CSV via papaparse; BudgetWithCostCentre uses Omit<Budget> intersection to avoid interface extension conflict |
| 2026-06-10 | F-004 complete. Admin UI for users + entities. shadcn/ui wired up. 36 tests passing. | Tailwind v4 requires @theme block for CSS variable → utility class mapping; service role only in lib/data layer |
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
