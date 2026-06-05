# Tech Stack

> **This is the single source of truth for technology choices.**
> Stack confirmed during `/init-architecture` (June 2026). Marked as FIXED in PRD — no deviation without explicit ADR.

## Current Stack

| Layer | Technology | Version | Purpose | Swap Difficulty |
|---|---|---|---|---|
| **Framework** | Next.js | 15 (App Router) | React server components, API routes, middleware, Server Actions | Medium |
| **Language** | TypeScript | 5+ (strict mode) | Type safety across all layers | Low (config only) |
| **Database** | Supabase | Latest hosted | PostgreSQL 15 + RLS + Auth + Storage + Edge Functions + DB Webhooks | Medium (see guide) |
| **Hosting** | Vercel Pro | — | Auto-deploy, preview environments, edge network | Low (see guide) |
| **UI Library** | shadcn/ui | Latest | Accessible Radix UI primitives; composable components | Low |
| **Styling** | Tailwind CSS | v4 | Utility-first CSS; Slate base colour; CSS variables for theming | Low |
| **Auth** | Supabase Auth + Azure AD | — | OAuth2 SSO via Microsoft Entra ID. Email/password **disabled**. | Medium |
| **Email** | Resend | Latest | Transactional email; approval notifications to non-platform users | Low |
| **Email templates** | React Email | Latest | React-based responsive HTML email templates | Low |
| **JWT signing** | jose | Latest | HMAC-SHA256 email action tokens | Low |
| **Server state** | TanStack React Query | v5 | Cache, optimistic updates, invalidation for server state | Low |
| **Forms** | React Hook Form | Latest | Performant form state management | Low |
| **Validation** | Zod | Latest | Runtime type validation; shared client + server schemas | Low |
| **Containerisation** | Docker + Docker Compose | Latest | Local dev environment; reproducible setup | Low |
| **Source control** | GitHub | — | Main branch protected; feature branch workflow | — |
| **CI/CD** | GitHub Actions | — | Type-check, lint, test on every PR; deploy to Vercel on main merge | Low |
| **Testing (unit)** | Vitest | Latest | Fast unit tests; Jest-compatible syntax | Low |
| **Testing (e2e)** | Playwright | Latest | Browser-based E2E against staging environment | Low |
| **Linting** | ESLint + Prettier | Latest | Code style and formatting | Low |

## Why These Choices

**Next.js 15 (App Router)** — Server Components reduce client JavaScript; built-in API routes handle webhooks and email actions without a separate backend; Server Actions replace bespoke form POST handlers. The `(dashboard)` route group enables a shared auth-protected layout. Fixed per BRS-USMP-001 §10.1.

**Supabase** — Managed PostgreSQL with Row Level Security enforced at the database layer (cannot be bypassed by application bugs); built-in Azure AD OAuth2 support; Storage for receipt uploads; Edge Functions for scheduled jobs (auto-escalation, Snowflake sync); Database Webhooks for the Snowflake integration event pipeline. All Supabase calls isolated in `src/lib/supabase/` and `src/lib/data/` — the client can be swapped without touching UI components.

**Azure AD SSO only** — Azure AD is the Group's single identity provider. No separate password system reduces credential attack surface and onboarding friction for 4,000 staff. Fixed per BRS-USMP-001 §10.2.

**shadcn/ui + Tailwind CSS v4** — Accessible Radix UI primitives with full keyboard/screen-reader support (WCAG 2.1 AA target); no heavy bundle since only used components are included; Slate base colour matches the professional governance tool tone; CSS variables allow consistent theming without custom CSS.

**Resend** — Reliable transactional email with a generous free tier; first-class React Email integration; emails must reach recipients who have no platform account (approval links), which rules out Supabase's built-in email for this use case.

**React Query v5** — Server state management with automatic background refetch, optimistic updates for approval actions, and fine-grained cache invalidation. Avoids prop-drilling for shared state like notification counts.

**jose** — Lightweight, standards-compliant JWT library for the HMAC-SHA256 email action tokens; no dependency on Node's `crypto` module (works in Edge runtime).

**Vitest + Playwright** — Vitest is faster than Jest with native TypeScript; `processApproval()` and token logic require 100% unit test coverage (FRS §11.1). Playwright tests the 7 E2E scenarios in FRS §11.2 against the staging environment.

**Docker + Docker Compose** — All environments (dev, staging, production) must be reproducible per BRS §10.1. Local dev runs `supabase start` + Next.js dev server; the Dockerfile produces the production build for Vercel.

## Local Development URL

```
https://localhost:3003
```

Start with: `next dev --experimental-https --port 3003`
The `--experimental-https` flag generates a self-signed certificate for local HTTPS (required to match the Azure AD redirect URI configuration).

## Swap Guides

### Swapping Supabase → Raw PostgreSQL + Custom Auth

**Effort:** ~2 days
1. Replace Supabase clients in `src/lib/supabase/` with `pg` or Drizzle ORM
2. Replace all data functions in `src/lib/data/` (interfaces stay the same — UI unchanged)
3. Replace Supabase Auth with NextAuth.js or Lucia (keep Azure AD as OAuth provider)
4. Migrations in `supabase/migrations/` are plain SQL — run directly on any PostgreSQL 15+ instance
5. RLS policies are standard PostgreSQL — keep them or replace with application-level middleware
6. Replace Supabase Storage with S3-compatible storage (e.g. Cloudflare R2)
7. Replace Edge Functions with Vercel Cron Jobs or equivalent

**What doesn't change:** All UI components, API route shapes, email templates, Playwright tests

### Swapping Vercel → Other Hosting

**Effort:** ~half a day
1. Add `Dockerfile` (already present) — tag and push to your container registry
2. Replace Vercel preview deploys with your CI pipeline's preview mechanism
3. Move environment variables to your platform's secret management
4. Remove `@vercel/analytics` if added

### Swapping Next.js → SvelteKit or Remix

**Effort:** ~4 days (routing is the main work)
- Routing: `src/app/` → framework-specific file conventions
- Server Components → framework-specific server-side rendering
- Server Actions → `form action` handlers or API endpoints
- `src/components/`, `src/lib/`, `src/types/` mostly unchanged

## Adding New Dependencies

Before adding any new package:
1. Check if an existing dependency already covers the need
2. Last commit within 6 months; TypeScript types included
3. Check bundle size at bundlephobia.com for client-side packages
4. Document here and create an ADR if it is a significant architectural choice
