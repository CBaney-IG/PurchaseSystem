# Feature Backlog

> **Source of truth for what to build and in what order.**
> Updated after every completed feature. Dependencies determine build order within each phase.
> Build sequence from PM-USMP-001 §5.1 — total estimate ~40 dev days.
> Run `/project-status` to see what's next.

## How to Read This

- **Priority:** P0 (must-have MVP), P1 (should-have MVP), P2 (post-MVP)
- **Status:** 📋 Backlog → 🔨 In Progress → ✅ Done → ❌ Cut
- **Dependencies:** Items that must be completed first (by ID)
- **Est.:** Rough days estimate from Product Manual build sequence

---

## Phase 1: Foundation
> Goal: Project scaffolding, auth, full schema, and core data model. Nothing user-facing yet.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-001 | Project scaffolding — Next.js 15, Supabase, Docker, Vercel, GitHub Actions CI/CD | P0 | ✅ | — | 1d | feature/F-001 | 2026-06-05 |
| F-002 | Azure AD SSO authentication (Supabase Auth + OAuth2 + middleware route protection) | P0 | 📋 | F-001 | 1d | | |
| F-003 | Full database schema + RLS policies + helper functions + triggers + indexes | P0 | ✅ | F-002 | 2d | feature/F-003 | 2026-06-09 |
| F-004 | User & entity management admin UI (create entities, invite users, assign roles, verify RLS) | P0 | ✅ | F-003 | 2d | feature/F-004 | 2026-06-10 |

## Phase 2: Master Data & Core Forms
> Goal: Administrators can configure the platform; requesters can submit PRs and expense claims.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-005 | Master data admin screens — cost centres, budgets, vendor catalogue, approval matrix, CSV import | P0 | ✅ | F-004 | 3d | feature/F-005 | 2026-06-10 |
| F-006 | Purchase Requisition form — all fields, draft save, budget check, approval path preview, submission | P0 | ✅ | F-005 | 3d | feature/F-006 | 2026-06-10 |
| F-007 | Expense claim form — all fields, receipt upload to Supabase Storage, OCR attempt, submission | P0 | 📋 | F-005 | 3d | | |

## Phase 3: Approval Engine & Inbox
> Goal: Requests route through approvers, with full status tracking.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-008 | Approval engine — processApproval(), routing logic, DOA matrix evaluation, status state machine, approval_event recording | P0 | 📋 | F-006, F-007 | 4d | | |
| F-009 | Approver inbox — pending request list, request detail drawer, approve/reject/request-info actions, bulk approve | P0 | 📋 | F-008 | 3d | | |
| F-010 | Email notifications — Resend integration, React Email templates, signed JWT email-action tokens, all notification triggers | P0 | 📋 | F-008 | 3d | | |

## Phase 4: POs, Budget Engine & Dashboard
> Goal: Full downstream flow from approved PR to PO; real-time budget tracking; unified dashboard.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-011 | Purchase Order generation — auto-draft PO from approved PR, PO management screen for Procurement Officer | P0 | 📋 | F-008 | 2d | | |
| F-012 | Budget engine — real-time balance on PR form, committed-spend updates on each approval event, over-budget flagging | P0 | 📋 | F-008 | 2d | | |
| F-013 | Dashboard — metric cards, approval inbox widget, recent requests list, budget alert banner, notification bell | P0 | 📋 | F-009, F-012 | 2d | | |

## Phase 5: Integrations & Reporting
> Goal: Snowflake data pipeline, audit PDF, CSV export, auto-escalation.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-014 | Snowflake integration — webhook handler, payload transformation, webhook_logs retry table, scheduled Edge Function for budget positions | P0 | 📋 | F-008 | 3d | | |
| F-015 | Audit trail & reports — per-document timeline, PDF audit report export, CSV bulk export, 7-year retention policy | P0 | 📋 | F-008 | 2d | | |
| F-016 | Auto-escalation — Supabase Edge Function cron (every 30 min), 24h reminder, 48h manager escalation | P1 | 📋 | F-009, F-010 | 1d | | |

## Phase 6: Nice-to-Have MVP Features
> Goal: Approval delegation, mobile PWA polish.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-017 | Approval delegation — set delegate, date range, validation, routing override, audit of delegated actions | P1 | 📋 | F-009 | 2d | | |
| F-018 | Mobile PWA — manifest, service worker, camera receipt capture, responsive layout audit, WCAG 2.1 AA pass | P1 | 📋 | F-013 | 2d | | |

## Phase 7: UAT & Hardening
> Goal: E2E test coverage matching FRS §11; bug fixes; UAT with business stakeholders.

| ID | Feature | Priority | Status | Dependencies | Est. | Branch | Completed |
|----|---------|----------|--------|--------------|------|--------|-----------|
| F-019 | E2E Playwright tests — happy path, rejection, email approval, delegation, budget over-limit, entity isolation, matrix change | P0 | 📋 | Phase 5 | 3d | | |
| F-020 | UAT with business stakeholders — AC-01 through AC-10 sign-off | P0 | 📋 | F-019 | 2d | | |

---

## Post-MVP (Phase 2)

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| F-021 | Automated OCR extraction from receipts | P2 | Phase 1 uses manual confirmation |
| F-022 | Supplier invoice approval routing | P2 | Separate workflow from PR/Expense |
| F-023 | Automated PO transmission to suppliers (EDI / email) | P2 | |
| F-024 | Native iOS / Android app | P2 | Phase 1 is mobile-responsive PWA |
| F-025 | MFA enforcement for approver and admin roles | P2 | Currently Azure AD handles MFA |
| F-026 | HR system sync for organisation hierarchy | P2 | Phase 1: manual user management |

---

## Bugs

> Track bugs found during development here. Prefix IDs with B-.

| ID | Bug | Severity | Status | Found In | Branch | Fixed |
|----|-----|----------|--------|----------|--------|-------|
| | | | | | | |

---

## Decisions Log

> Quick reference for decisions made during development that aren't big enough for an ADR.

| Date | Decision | Context |
|------|----------|---------|
| 2026-06-01 | Next.js 15 (not 14) | BRS/FRS mandate Next.js 15 specifically; template default was 14+ |
| 2026-06-01 | No email/password auth | Azure AD SSO is the only permitted identity provider per BRS §10.2 |
| 2026-06-01 | Resend for transactional email | Required to send email to recipients without a platform account |
| 2026-06-01 | Single spend_requests table for PRs and expenses | Unified table simplifies approval engine; type column distinguishes them |
| 2026-06-05 | Email/password auth for local dev (F-001) | Azure AD credentials not yet available from IT Director. Login page shows email/password form in dev; Microsoft button enabled when NEXT_PUBLIC_ENABLE_AZURE_AUTH=true. Azure AD wired in F-002. |
| 2026-06-10 | Client-side CSV parsing for vendor/budget import (F-005) | Used papaparse in the browser to parse, validate row-by-row, and preview before POST. See tech-stack.md "CSV Import" for migration path to server-side if needed at scale. |
