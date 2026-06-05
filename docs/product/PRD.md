# Product Requirements Document

> **Status:** Active — sourced from BRS-USMP-001 and FRS-USMP-001 (May 2026)

## Product Overview

**Name:** Unified Spend Management Platform (USMP)
**One-liner:** A governed, auditable, web-based spend management platform that replaces email-based procurement approvals across BPO Group with a configurable multi-level approval engine and real-time spend intelligence.
**Target user:** All BPO Group staff across all entities — from operations staff submitting purchase requests, to line managers approving via email, to the Procurement Officer managing vendor catalogues and the BI team consuming Snowflake spend data.

## Problem Statement

BPO Group operates a multi-entity, multi-site business serving approximately 4,000 staff. All procurement spend — purchase requests, purchase orders, supplier invoices, and employee expense claims — is currently managed through informal email chains, verbal approvals, and spreadsheets.

This creates four categories of business risk:

| Risk | Business Impact |
|------|----------------|
| **Governance failure** | No documented delegation of authority. Spend approved outside policy with no audit trail. |
| **Financial leakage** | No budget enforcement at point of request. Overspend identified only in month-end reports. |
| **Operational inefficiency** | Approval cycles take 3–5 days via email. Requesters have no status visibility. Finance chases approvals manually. |
| **Data blindness** | Zero spend data feeding the Group's Snowflake / Power BI reporting environment. Management decisions made without spend intelligence. |

## Core Features (MVP)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | Purchase Requisition (PR) workflow | Create, submit, and route PRs through a configurable multi-level approval chain aligned to the DOA matrix | Must-have |
| 2 | Multi-level approval engine | DOA-aligned approval routing with 3–6 configurable tiers; auto-escalation by amount and category | Must-have |
| 3 | Email approval links | Approve or reject requests via signed email link without logging in; HMAC-SHA256 JWT, 48h expiry, single-use | Must-have |
| 4 | Budget tracking & enforcement | Real-time budget availability per cost centre; over-budget flagging on submission and in approver view | Must-have |
| 5 | Expense claim submission | Employee expense claims with receipt photo upload; OCR pre-population of vendor, amount, date | Must-have |
| 6 | Purchase Order generation | Auto-draft PO from approved PR; Procurement Officer PO management screen | Must-have |
| 7 | Audit trail & reporting | Immutable per-document audit log; on-demand PDF audit report; CSV export for external audit | Must-have |
| 8 | Snowflake data integration | Real-time webhook push of approval events; 15-min scheduled budget position sync | Must-have |
| 9 | Vendor / supplier catalogue | Managed approved vendor list with preferred status; searchable in PR form | Must-have |
| 10 | Multi-entity data isolation | Strict RLS-enforced isolation between Group entities; group_admin cross-entity consolidated view | Must-have |
| 11 | Role-based access control | 8 user roles (requester, approver_l1/l2/l3, procurement_officer, finance, admin, group_admin) with row-level security | Must-have |
| 12 | Admin self-service configuration | DOA matrix, user management, vendor catalogue, budgets — all configurable via UI without code deployment | Must-have |
| 13 | Approval delegation | Approvers can delegate authority to a nominated colleague for a defined date range | Nice-to-have |
| 14 | Auto-escalation | Unanswered approvals trigger a reminder at 24h and escalate to the approver's manager at 48h | Nice-to-have |
| 15 | Mobile-responsive PWA | Full functionality on iOS Safari and Android Chrome; receipt photo upload from mobile camera | Nice-to-have |

## Out of Scope (MVP)

- EFT payment execution or bank integration
- Contract lifecycle management
- Asset procurement lifecycle tracking (separate system)
- Accounts payable accounting system (integration point only — no AP module)
- Payroll integration
- Native mobile app (iOS / Android) — Phase 2
- Automated PO transmission to suppliers via EDI or email — Phase 2
- Supplier invoice approval routing — Phase 2
- Automated OCR extraction — Phase 2 (Phase 1: manual data entry with upload)

## User Personas

### Primary: Operations Staff (Requester)
- **Context:** Day-to-day operations across all BPO Group entities; submitting purchase requests for equipment, services, consumables, and expense reimbursements
- **Goals:** Submit requests quickly without procurement training; track status without chasing by email; know their request was received
- **Frustrations:** Current email process has no visibility; requests get lost; no confirmation of receipt; approval can take days with no updates

### Primary: Line Manager (L1 Approver)
- **Context:** Receives approval requests for direct reports; often mobile, in meetings, or on the operations floor
- **Goals:** Approve or reject with enough context to decide; take action from email without logging in; delegate when on leave
- **Frustrations:** Email approval requests lack detail and budget context; no consolidated view of pending items; cannot delegate without asking someone else to forward emails

### Secondary: Senior Manager / Head of Department (L2 Approver)
- **Context:** Approves escalated requests above L1 threshold; accountable for departmental budget performance
- **Goals:** Clear budget impact visibility; bulk approve routine requests; understand what L1 already reviewed
- **Frustrations:** Receives escalations without full context; no consolidated view of departmental committed spend
- **Differs from primary:** Higher spend thresholds; budget accountability; less frequent but higher-stakes approvals

### Secondary: CFO / Finance Director (L3 Approver)
- **Context:** Final approver for high-value spend; sets financial policy; accountable to the Board
- **Goals:** Confidence that governance is enforced at lower levels; audit trail available on demand; budget not being exceeded without visibility
- **Frustrations:** Receives large-value approval requests without context of the prior approval chain
- **Differs from primary:** Approves infrequently but for large amounts; focused on policy compliance and budget integrity

### Secondary: Procurement Officer (Platform Admin)
- **Context:** Daily user; manages vendor catalogue, processes approved PRs into POs, configures DOA matrix and workflows
- **Goals:** Single platform for all procurement; easy DOA matrix updates without IT involvement; full spend visibility across entities
- **Frustrations:** Currently manages all procurement through email; no vendor catalogue; no PO tracking; no audit trail
- **Differs from primary:** Admin access; platform configuration without developer involvement; daily operational user

### Secondary: Finance Team
- **Context:** Budget custodians; need accurate committed and actual spend data for period-end reporting and Power BI
- **Goals:** Real-time budget visibility; accurate Snowflake data for Power BI; no manual data collection
- **Frustrations:** Month-end surprises; no reliable committed spend tracking before invoices arrive; management reports are built from spreadsheets
- **Differs from primary:** Read access to budgets across entity; not submitting or approving requests

### Secondary: Group Admin (Head of Projects & Procurement)
- **Context:** Platform owner; governance accountability across all entities; reports to executive team on spend compliance
- **Goals:** Full spend visibility across the Group; DOA compliance enforced automatically; low support burden on IT
- **Frustrations:** No consolidated procurement data; each entity operates independently with no Group-level view
- **Differs from primary:** Cross-entity access; manages entity structure, users, and platform-wide policy

### Secondary: Data / BI Team
- **Context:** Consumes structured spend data in Snowflake for Power BI management dashboards
- **Goals:** Reliable, timely, well-structured data matching the agreed Snowflake schema; no ETL maintenance burden
- **Frustrations:** No spend data currently flowing to Snowflake; management reports are manual and delayed
- **Differs from primary:** Does not use the platform UI; consumes data via Snowflake; focused on schema reliability and refresh latency

## User Flows

### Flow 1: Purchase Requisition (Standard Approval Path)
1. Staff member logs in via Azure AD SSO (no separate account needed)
2. Clicks 'New Purchase Request' from the dashboard
3. Completes PR form: title, category, cost centre (shows remaining budget inline), preferred vendor, estimated amount, required-by date, priority, description, justification, attachments
4. System validates budget availability and flags over-budget requests with a warning (does not block submission)
5. System shows approval path preview — who will approve and in what order — before submission
6. Staff submits; receives confirmation with auto-generated reference number (e.g. PR-2026-00042)
7. L1 Approver receives email with request summary, budget impact, and one-click Approve / Reject buttons
8. L1 Approver clicks Approve (no login required); if amount exceeds L1 threshold, system auto-routes to L2
9. On final approval: PR status = Approved; Procurement Officer notified; draft PO generated within 60 seconds
10. On any rejection: Requester notified with mandatory rejection reason; PR status = Rejected

### Flow 2: Expense Claim Submission
1. Employee clicks 'New Expense Claim' from dashboard
2. Uploads receipt photograph from device (mobile camera supported)
3. System attempts OCR extraction of vendor name, amount, and date from receipt image
4. Employee confirms or corrects extracted data; assigns cost centre and project code
5. Employee submits; claim routes through DOA matrix for expense category
6. On final approval: claim exported to Finance for reimbursement processing; audit record created

### Flow 3: Approver Delegation
1. Approver navigates to profile or delegation screen
2. Sets delegate user, valid-from and valid-until dates, and reason
3. System validates no date overlap with an existing active delegation
4. While delegation is active: all approval requests route to the delegate (not the delegator)
5. Both delegator and delegate receive in-app and email notification; delegation shown in approver inbox

### Flow 4: Admin — DOA Matrix Update
1. Admin navigates to Admin > Approval Matrix
2. Clicks a cell (category × level) to edit threshold; popover shows Min Amount, Max Amount, Approver Role, AND/OR logic, and Escalation Hours
3. Admin uses 'Simulate Approval Path' — enters hypothetical category and amount — system shows who would approve
4. Admin saves; new thresholds take effect immediately for all new requests
5. Change is recorded in audit log with timestamp and editor identity; previous value preserved

## Success Metrics

- [ ] 100% of spend requests follow the defined approval path before any commitment (BO-01)
- [ ] Zero spend approvals conducted via email within 30 days of go-live (BO-02)
- [ ] Budget utilisation visible within 15 minutes of any approval action (BO-03)
- [ ] Every approved document generates a timestamped, actor-attributed, immutable audit record (BO-04)
- [ ] All approved transactions available in Snowflake FACT_SPEND_REQUESTS within 60 minutes of approval (BO-05)
- [ ] Single platform in use across all Group entities; no parallel processes within 60 days (BO-06)
- [ ] 80% of routine requests under R5,000 approved within 4 business hours (BO-07)
- [ ] A new requester can complete their first PR submission within 5 minutes, unaided (BO-08 / AC-01)

## Design Preferences

- [x] Desktop-first with full mobile-responsive support (PWA-capable for field staff)
- [x] Information-dense dashboard; clean, guided form layouts for requesters
- [x] shadcn/ui component library, Slate base colour, CSS variables, Tailwind CSS v4
- [x] WCAG 2.1 AA accessibility minimum
- [x] Professional and precise tone — this is a governance and finance tool, not a consumer product
- [x] Colour-coded status indicators: green (approved / within budget), amber (warning / near limit), red (rejected / over budget)
- [x] Loading states and empty states required on every screen
- [x] Confirmation modals required before all approval actions

## Reference Products / Mental Model

- **Coupa / SAP Ariba** — enterprise spend management; USMP is a right-sized bespoke version for a 4,000-person multi-entity group without the complexity or six-figure licensing cost
- **ApprovalMax** — configurable approval routing UI; USMP replicates the core approval chain concept without the SaaS dependency
- **Linear** — clean, keyboard-friendly UI; fast load times; good reference for the approver inbox UX and status badge design

## Constraints

- **Timeline:** Go-live within 90 days of development kickoff
- **Team:** 1 senior developer + 1 platform admin (Procurement Officer) + oversight by Head of Projects & Procurement. No dedicated DevOps team.
- **Compliance:** POPIA (Protection of Personal Information Act, South Africa) for personal data; ISO 27001 alignment documented in [docs/architecture/security.md](../architecture/security.md)
- **Technical — FIXED stack:** Next.js 15 (App Router, TypeScript strict), Supabase (PostgreSQL 15 + RLS + Auth), shadcn/ui + Tailwind CSS v4, Docker + Docker Compose, Vercel Pro, GitHub Actions. No deviation without explicit decision.
- **Auth:** Azure Active Directory / Microsoft Entra ID SSO only. No email/password system. Azure AD is single source of truth for user identity.
- **No third-party approval SaaS:** No ApprovalMax, Expensify, or equivalent — this is a bespoke build.
- **Snowflake:** REST API / webhook integration only. No direct database-to-database connector.
- **Email:** Resend for transactional email. Notifications must function without the recipient having a platform account.
- **Currency:** ZAR (South African Rand) default; multi-currency field available but ZAR is the operating currency.
- **Budget:** No paid third-party SaaS beyond the core stack. All services must be on free or existing paid tiers.

> For full visual direction, brand voice, and interaction principles, see [design-system.md](design-system.md) (populated by the optional `/init-design-system` step).
