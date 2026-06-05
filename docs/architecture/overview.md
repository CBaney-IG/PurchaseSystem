# Architecture Overview

> **Status:** Active — confirmed during `/init-architecture` (June 2026)

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Mobile PWA                          │
│                   (Chrome, Edge, Safari — desktop + mobile)          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────────┐
│                    Next.js 15 — App Router (Vercel Pro)              │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Server Components│  │  Server Actions  │  │   API Routes      │  │
│  │  (read / render) │  │  (form mutations)│  │  /api/**          │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬──────────┘  │
│           │                     │                      │             │
│  ┌────────▼─────────────────────▼──────────────────────▼──────────┐  │
│  │                    src/lib/ (shared layer)                      │  │
│  │   supabase/client.ts   supabase/server.ts   supabase/service.ts │  │
│  │   approvals/processApproval.ts   notifications/   snowflake/   │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │ Middleware (auth guard)               │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
┌─────────▼──────────┐ ┌────────▼────────┐  ┌─────────▼──────────────┐
│  Supabase (hosted) │ │  Azure AD /     │  │  External services     │
│                    │ │  Microsoft      │  │                        │
│  PostgreSQL 15     │ │  Entra ID       │  │  Resend (email)        │
│  + RLS policies    │ │  (SSO only)     │  │  Snowflake (webhook)   │
│  + Auth            │ │                 │  │  Supabase Storage      │
│  + Storage         │ │  OAuth2 flow    │  │  (attachments)         │
│  + Edge Functions  │ │                 │  │                        │
│  + DB Webhooks     │ └─────────────────┘  └────────────────────────┘
└────────────────────┘
         │
         │  Supabase DB Webhook (INSERT on approval_events)
         ▼
┌─────────────────────┐        ┌────────────────────────────────────┐
│  /api/webhooks/     │───────▶│  Snowflake data pipeline endpoint  │
│  snowflake-push     │  HTTPS │  FACT_SPEND_REQUESTS               │
│  (transform +       │  POST  │  FACT_APPROVAL_EVENTS              │
│   retry logic)      │        │  FACT_BUDGET_POSITIONS             │
└─────────────────────┘        │  DIM_VENDORS / DIM_USERS etc.      │
                               └────────────────────────────────────┘
```

## Directory Structure

```
/usmp
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx            # Azure AD SSO entry
│   │   └── auth/callback/route.ts   # OAuth callback handler
│   ├── (dashboard)/                 # All protected routes
│   │   ├── layout.tsx               # Auth guard + sidebar shell
│   │   ├── dashboard/page.tsx
│   │   ├── requests/
│   │   │   ├── page.tsx             # My requests list
│   │   │   ├── new/page.tsx         # New PR form
│   │   │   └── [id]/page.tsx        # PR detail + audit timeline
│   │   ├── expenses/
│   │   │   └── new/page.tsx         # New expense claim
│   │   ├── approvals/page.tsx       # Approver inbox
│   │   ├── purchase-orders/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── budgets/page.tsx
│   │   ├── reports/page.tsx         # Audit log, PDF/CSV export
│   │   └── admin/                   # admin / group_admin only
│   │       ├── users/
│   │       ├── entities/
│   │       ├── approval-matrix/
│   │       ├── cost-centres/
│   │       ├── budgets/
│   │       └── vendors/
│   └── api/
│       ├── requests/[id]/
│       │   ├── submit/route.ts
│       │   └── cancel/route.ts
│       ├── approvals/
│       │   ├── inbox/route.ts
│       │   ├── email-action/route.ts  # No session auth — JWT token
│       │   └── [id]/
│       │       ├── approve/route.ts
│       │       ├── reject/route.ts
│       │       ├── request-info/route.ts
│       │       └── provide-info/route.ts
│       ├── admin/
│       │   ├── users/route.ts
│       │   ├── entities/route.ts
│       │   ├── approval-matrix/route.ts
│       │   ├── vendors/route.ts
│       │   ├── budgets/route.ts
│       │   └── delegations/route.ts
│       └── webhooks/
│           └── snowflake-push/route.ts
├── components/
│   ├── ui/                          # shadcn/ui components (generated)
│   ├── requests/                    # PR/expense form components
│   ├── approvals/                   # Inbox, drawer, action buttons
│   ├── dashboard/                   # Metric cards, activity feed
│   └── admin/                       # Matrix grid, user table etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server component / action client
│   │   └── service.ts               # Service role client (API routes only)
│   ├── approvals/
│   │   └── processApproval.ts       # Core approval routing engine
│   ├── notifications/
│   │   ├── emailTokens.ts           # JWT sign / validate
│   │   └── send.ts                  # Resend dispatch helpers
│   ├── snowflake/
│   │   └── retry.ts                 # webhook_logs retry logic
│   └── utils/
│       ├── refNumber.ts             # PR-YYYY-NNNNN generation
│       └── formatCurrency.ts
├── hooks/
│   ├── useCurrentUser.ts
│   ├── useApprovalInbox.ts
│   └── useBudgetPosition.ts
├── types/
│   ├── domain.ts                    # Core domain interfaces
│   ├── api.ts                       # API request/response shapes
│   └── supabase.ts                  # Auto-generated Supabase types
├── emails/                          # React Email templates
│   ├── ApprovalNeeded.tsx
│   ├── RequestApproved.tsx
│   ├── RequestRejected.tsx
│   ├── ApprovalReminder.tsx
│   ├── ApprovalEscalated.tsx
│   └── DelegationActive.tsx
├── supabase/
│   ├── config.toml
│   ├── migrations/                  # Numbered SQL files
│   └── seed/                        # Dev seed data
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .github/workflows/
│   └── deploy.yml
└── middleware.ts                    # Route protection
```

## Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | Server components reduce client JS; built-in API routes; file-based routing. Fixed per PRD. |
| Database | Supabase PostgreSQL 15 | Managed hosting; built-in auth; RLS; dashboard for non-technical admins. All access in `src/lib/`. |
| Auth | Azure AD SSO only | Single identity source per BRS §10.2; no separate password system. Email/password disabled. |
| UI library | shadcn/ui + Tailwind CSS v4 | Accessible Radix UI primitives; Slate theme; composable without a heavy bundle. |
| Mutations | Service role key on server only | RLS policies enforced for reads; service role used only in API routes / Server Actions, never the browser. |
| State | React Query v5 | Server state cache, optimistic updates, invalidation — avoids prop-drilling and manual refetch logic. |
| Email tokens | HMAC-SHA256 JWT via `jose` | 48h expiry, single-use, server-validated — allows approvaltokensin email without requiring login. |
| Snowflake | Webhook push + scheduled Edge Function | REST-only (no DB-to-DB connector per BRS §10.1); real-time for events, 15-min schedule for budgets. |
| Entity isolation | PostgreSQL RLS | Enforced at DB layer — cannot be bypassed via application bugs; `group_admin` role only cross-entity role. |

## Data Flow

### Read path
1. Server Component calls `createClient()` (server) with user's session
2. Supabase evaluates RLS — user sees only their entity's data
3. Data returned as typed result; component renders

### Write / mutation path
1. Client calls a Server Action or POSTs to an API route
2. Server Action / route uses `createServiceClient()` (bypasses RLS intentionally)
3. Business logic executed (e.g. `processApproval()`)
4. Status updated, `approval_event` inserted, notifications queued
5. Supabase DB Webhook fires → `snowflake-push` handler
6. React Query cache invalidated via `revalidatePath` / `revalidateTag`

### Email approval path
1. Approval email sent with signed JWT in CTA link URL
2. Approver clicks link → `GET /api/approvals/email-action?token=<jwt>`
3. Handler validates token (signature, expiry, not-consumed), extracts `requestId` + `approverId` + `action`
4. Calls `processApproval()` — identical outcome to in-platform action
5. Token marked consumed in `webhook_logs`; HTML confirmation page returned

## Authentication Flow

```
Browser                  Next.js                 Supabase Auth          Azure AD
   │                        │                         │                     │
   │  GET /login            │                         │                     │
   │───────────────────────▶│                         │                     │
   │                        │  signInWithOAuth        │                     │
   │                        │ (provider: 'azure')     │                     │
   │                        │────────────────────────▶│                     │
   │                        │                         │  redirect to MSAL   │
   │◀──────────────────────────────────────────────────────────────────────▶│
   │          User authenticates with Microsoft credentials                  │
   │                        │                         │◀────────────────────│
   │                        │                         │  auth code          │
   │  GET /auth/callback    │                         │                     │
   │───────────────────────▶│  exchange code          │                     │
   │                        │────────────────────────▶│                     │
   │                        │◀────────────────────────│                     │
   │                        │  session cookie set      │                     │
   │  redirect → /dashboard │                         │                     │
   │◀───────────────────────│                         │                     │
```

On first login, a DB trigger on `auth.users` creates a `profiles` row with `role = 'requester'` and assigns to the DEFAULT entity.

## Component Boundaries

- **Server Components** own data fetching (Supabase reads) and pass data down as props
- **Client Components** (`'use client'`) handle interactivity: forms, modals, drawers, real-time notification bell
- **Server Actions** handle all mutations (PR submission, approval actions, admin CRUD)
- **API Routes** handle: webhook receiver, email-action (no-auth), any operation needing raw `Request`/`Response` control
- All Supabase calls are in `src/lib/` — components never import the Supabase client directly
