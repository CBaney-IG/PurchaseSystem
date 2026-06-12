# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 7 — UAT & Hardening (F-019, F-020)
**Phase goal:** E2E Playwright test suite and UAT sign-off with business stakeholders.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |

## Last Session Summary

**Date:** 2026-06-12
**What was done:**
- F-018 complete: Mobile PWA
  - `public/manifest.json` — standalone PWA manifest, 3 shortcuts, 192+512 icons
  - `public/sw.js` — service worker: cache-first for static, network-only for /api/ and /auth/, navigation fallback
  - `app/layout.tsx` — manifest, Apple web app meta tags, theme-color viewport, SW registration
  - `next.config.ts` — camera=(self) permission policy (was blocking receipt capture), Service-Worker-Allowed header
  - `components/sidebar.tsx` — full mobile redesign: fixed top bar + hamburger, slide-over panel with backdrop overlay; desktop sidebar unchanged; all buttons 44×44px min touch target; aria-labels
  - `app/(dashboard)/layout.tsx` + `dashboard/page.tsx` — pt-14 mobile clearance, responsive padding and header row
  - `app/globals.css` — overflow-x: hidden
  - 32 new tests; 360 total passing

- F-017 complete: Approval Delegation
  - `lib/data/delegations.ts` — data layer: listMyDelegations, getMyActiveDelegation, resolveEffectiveApprover, getDelegationContextForActor, createDelegation (overlap + self-delegation guards), cancelDelegation (ownership check)
  - `app/api/admin/delegations/route.ts` — GET/POST/DELETE; POST sends DelegationActive email fire-and-forget
  - `emails/DelegationActive.tsx` — email template (delegator confirmation + delegate notification, green banner)
  - `lib/notifications/send.ts` — sendDelegationNotification() (stub-mode aware, renders both sides)
  - `lib/approvals/processApproval.ts` — delegation hooks: records `metadata: { delegated_action, delegated_by }` on events; resolves delegates when routing next-level notifications via resolveEffectiveApprover
  - `components/delegations/DelegationForm.tsx` + `DelegationList.tsx` — create + list/cancel UI with Dialog confirm
  - `components/ui/card.tsx` — shadcn Card (was missing from initial scaffold)
  - `app/(dashboard)/profile/page.tsx` — profile page: account details card + delegation section (shown only for approver roles)
  - 19 new tests; 315 total passing

**What's next:**
- F-019 (E2E Playwright tests) — READY; all Phase 5 features complete ✅

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Apply migrations to cloud: `supabase db push --project-ref otjyioljufgcccgsdiuk`
- Snowflake endpoint URL — Data team (needed for F-014 — built with stub, ready to wire)
- Resend API key — get real key from resend.com; replace re_stub placeholder in .env.local
- Regenerate `types/supabase.ts` from live schema: `supabase gen types typescript --project-id otjyioljufgcccgsdiuk > types/supabase.ts`

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-12 | F-018 complete. Mobile PWA: manifest, service worker, responsive sidebar with slide-over, 44px touch targets. 360 tests. | Sidebar rebuilt with hidden md:flex pattern; mobile top bar fixed at 56px, dashboard pt-14 clears it; camera=(self) was missing from Permissions-Policy — was silently blocking receipt capture |
| 2026-06-12 | F-014 + F-015 + F-016 + F-017 complete. Snowflake webhook, audit PDF/CSV, auto-escalation, approval delegation. 315 tests. | F-014/F-015/F-016 merged via PR; F-017 on feature/F-017; delegation overlap check: valid_from < newUntil AND valid_until > newFrom; DelegationActive email renders two variants via isDelegator prop |
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
