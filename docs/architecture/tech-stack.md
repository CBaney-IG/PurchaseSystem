# Tech Stack

> **This is the single source of truth for technology choices.**
> All other docs reference this file. When swapping a technology, update HERE first, then follow the migration checklist at the bottom.

## Current Stack

| Layer | Technology | Version | Purpose | Swap Difficulty |
|-------|-----------|---------|---------|-----------------|
| **Framework** | Next.js | 14+ (App Router) | React framework with SSR, routing, API routes | Medium |
| **Language** | TypeScript | 5+ (strict mode) | Type safety across frontend and backend | Low (config only) |
| **Database** | Supabase | Latest | Managed PostgreSQL + Auth + RLS | Medium (see guide) |
| **Hosting** | Vercel | — | Auto-deploy, preview environments, edge network | Low (see guide) |
| **Styling** | Tailwind CSS | 3+ | Utility-first CSS framework | Low |
| **Auth** | Supabase Auth | — | Email/password + OAuth, session management | Medium |
| **Testing (unit)** | Vitest | Latest | Fast unit/integration tests, Jest-compatible | Low |
| **Testing (e2e)** | Playwright | Latest | Browser-based end-to-end tests | Low |
| **Validation** | Zod | Latest | Runtime type validation for forms and APIs | Low |
| **Linting** | ESLint + Prettier | Latest | Code style and formatting | Low |

## Why These Choices

**Next.js** — App Router provides server components (less client JS), built-in API routes (no separate backend needed for MVP), and file-based routing (intuitive structure). Widely supported and well-documented.

**Supabase over raw PostgreSQL** — Managed hosting, built-in auth, Row Level Security, and a dashboard for non-technical team members. All data access is isolated in `src/lib/data/` so the client can be swapped without touching UI code. Migrations are plain SQL.

**Vercel over self-hosting** — Zero-config Next.js deployment, automatic preview URLs for every PR (our "preview" environment), and instant rollback. No Docker or server management needed for MVP.

**TypeScript strict mode** — Catches bugs at compile time. Strict mode prevents loose typing that causes runtime errors. Non-negotiable for quality.

**Tailwind over CSS modules/styled-components** — Utility classes keep styles colocated with markup, no naming debates, small bundle size. Trade-off: HTML can look busy, but readability improves with component extraction.

**Vitest over Jest** — Faster, native TypeScript support, compatible with Jest syntax so migration is trivial if needed.

**Zod** — Runtime validation that generates TypeScript types. Use for form inputs, API request/response validation, and environment variable checking. Single library for all validation needs.

## Swap Guides

### Swapping Supabase → Raw PostgreSQL + Custom Auth

**Effort:** ~1-2 days for a small app
**What changes:**
1. Replace Supabase client in `src/lib/supabase/` with a PostgreSQL client (e.g., `pg`, Drizzle ORM, or Prisma)
2. Replace all functions in `src/lib/data/` to use the new client (interfaces stay the same)
3. Replace Supabase Auth with your chosen auth provider (NextAuth.js, Lucia, Clerk, etc.)
4. Migrations in `supabase/migrations/` are plain SQL — run directly on any PostgreSQL instance
5. RLS policies are standard PostgreSQL — they work on any PostgreSQL database
6. Update environment variables in `.env.example` and Vercel dashboard

**What doesn't change:** UI components, pages, hooks, API contracts, tests (if mocking data layer)

### Swapping Vercel → Other Hosting

**Effort:** ~Half a day
**What changes:**
1. Add a `Dockerfile` or platform-specific config (e.g., `fly.toml` for Fly.io)
2. Replace Vercel preview deploys with your CI/CD pipeline's preview mechanism
3. Move environment variables to your new platform's secret management
4. Update `docs/development/environments.md` and `docs/development/git-workflow.md`

**What doesn't change:** All application code, database, auth, tests

**Vercel-specific features to watch for:**
- `next.config.js` → `images.remotePatterns` (Vercel optimizes images; other hosts need `next/image` loader config)
- Edge middleware (if used) → may need adaptation for Node.js runtime
- Analytics/Speed Insights (if added) → remove or replace

### Swapping Next.js → Another React Framework

**Effort:** ~3-5 days for a small app (most work is routing)
**What changes:**
1. Routing structure (`src/app/` → framework-specific routing)
2. Server components → standard React components with data fetching
3. Server actions → API endpoints
4. `next.config.js` → framework-specific config

**What doesn't change:** `src/components/`, `src/lib/`, `src/hooks/`, all data access, database, tests (mostly)

### Swapping Tailwind → Another Styling Approach

**Effort:** Proportional to number of components
**What changes:** All className attributes in components
**What doesn't change:** Everything else

## Adding New Technologies

Before adding a new dependency, check:
1. Is there an existing dependency that already does this? (see `package.json`)
2. Is it actively maintained? (last commit within 6 months, open issues addressed)
3. What's the bundle size impact? (check on [bundlephobia.com](https://bundlephobia.com))
4. Does it have TypeScript types? (required)
5. Document the addition: update this file and create an ADR if it's a significant choice
