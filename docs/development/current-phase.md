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
- F-005 complete: Master data admin screens
  - `lib/data/vendors.ts` — listVendors, createVendor, updateVendor, importVendors
  - `lib/data/cost-centres.ts` — listCostCentres, getCostCentreById, createCostCentre, updateCostCentre
  - `lib/data/budgets.ts` — listBudgets, upsertBudget, importBudgets (with cost_centre_code → UUID resolution)
  - `lib/data/approval-matrix.ts` — listMatrix, listDistinctCategories, simulateApprovalPath, updateMatrixCell, createMatrixCell
  - API routes: `/api/admin/vendors`, `/api/admin/cost-centres`, `/api/admin/budgets`, `/api/admin/approval-matrix`, `/api/admin/approval-matrix/simulate`
  - Components: VendorTable, VendorForm, VendorCSVImport, CostCentreTable, CostCentreForm, BudgetTable, BudgetForm, BudgetCSVImport, ApprovalMatrixGrid (with inline MatrixCellEditor), SimulatePathTool, AdminNav
  - Pages: `/admin/vendors`, `/admin/cost-centres`, `/admin/budgets`, `/admin/approval-matrix`, `/admin` (role-based redirect)
  - 55 new unit tests; 91 total across 7 suites (all passing)
  - CSV import: client-side via papaparse (row-by-row validation + preview before POST). Migration path to server-side documented in tech-stack.md.
  - Mid-year budget adjustments require mandatory `reason` field (client-enforced)
  - "Simulate approval path" tool reuses `getRequiredLevels()` from lib/approvals/matrix.ts

**What's next:**
- F-005 branch ready to PR (feature/F-005)
- F-006 (Purchase Requisition form) — READY to start once F-005 is merged
- F-007 (Expense claim form) — depends on F-005

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migration to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-10 | F-005 complete. All 4 master data screens built. 91 tests passing. | Client-side CSV via papaparse; BudgetWithCostCentre uses Omit<Budget> intersection to avoid interface extension conflict |
| 2026-06-10 | F-004 complete. Admin UI for users + entities. shadcn/ui wired up. 36 tests passing. | Tailwind v4 requires @theme block for CSS variable → utility class mapping; service role only in lib/data layer |
| 2026-06-09 | F-003 complete. Full schema + RLS + indexes pushed to cloud. Matrix helpers + 13 tests written. | DOA logic: levels are cumulative up to first level whose max_amount >= amount; inactive levels are skipped |
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
