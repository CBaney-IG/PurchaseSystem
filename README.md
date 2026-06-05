# Purchase System — Unified Spend Management Platform

> A governed, auditable spend management platform replacing email-based procurement approvals across BPO Group with a configurable multi-level approval engine and real-time spend intelligence.

**Repo:** https://github.com/CBaney-IG/PurchaseSystem
**Local dev:** https://localhost:3003
**Stack:** Next.js 15 · Supabase (PostgreSQL 15 + RLS) · Azure AD SSO · shadcn/ui · Tailwind CSS v4 · Vercel Pro

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | v20 LTS | [nodejs.org](https://nodejs.org/) |
| npm | v10+ | Comes with Node.js |
| Git | v2.40+ | [git-scm.com](https://git-scm.com/) |
| Docker Desktop | v4.30+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Supabase CLI | v1.200+ | `npm install -g supabase` |
| Vercel CLI | Latest | `npm install -g vercel` |
| VS Code | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |

**Accounts needed:** GitHub · [Supabase](https://supabase.com) · [Vercel](https://vercel.com) · [Resend](https://resend.com)
**Credentials needed from IT Director:** Azure AD tenant ID, client ID, client secret

---

## Quick Start (local dev)

```bash
# 1. Clone
git clone https://github.com/CBaney-IG/PurchaseSystem.git
cd PurchaseSystem

# 2. Install dependencies (after F-001 scaffolding)
npm install

# 3. Start local Supabase (requires Docker Desktop running)
supabase start
# Copy the anon key and service key from the output → paste into .env.local

# 4. Set up environment variables
cp .env.example .env.local
# Fill in .env.local — see Environment Variables section below

# 5. Apply database migrations
supabase db reset

# 6. Start the dev server (HTTPS required for Azure AD)
npm run dev
# Runs: next dev --experimental-https --port 3003
```

Open **https://localhost:3003** — accept the self-signed certificate warning on first run.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in each value:

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `supabase start` output |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) | `supabase start` output |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server only** | `supabase start` output |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID | IT Director |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID | IT Director |
| `AZURE_AD_CLIENT_SECRET` | Azure AD app client secret | IT Director |
| `RESEND_API_KEY` | Resend API key for email | [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | From address for notifications | e.g. `noreply@bpogroup.co.za` |
| `EMAIL_ACTION_SECRET` | HMAC key for approval email tokens | `openssl rand -hex 32` |
| `SNOWFLAKE_WEBHOOK_SECRET` | Shared secret for Supabase → USMP webhook | `openssl rand -hex 32` |
| `SNOWFLAKE_ENDPOINT_URL` | Snowflake pipeline endpoint | Data team |
| `NEXT_PUBLIC_APP_URL` | Full URL of this environment | `https://localhost:3003` (local) |

> ⚠️ Never commit `.env.local` — it is gitignored. Production secrets live in the Vercel dashboard.

---

## Deploying to Vercel

### First-time setup

```bash
# 1. Authenticate with Vercel via your GitHub account
vercel login

# 2. Link this project (run from the project root)
vercel

# When prompted:
#   Set up and deploy? → Yes
#   Which scope? → select your account or org
#   Link to existing project? → No (first time)
#   Project name → purchase-system
#   In which directory is your code? → ./
```

After linking, note your IDs — needed for GitHub Actions CI/CD:

```bash
cat .vercel/project.json
# { "orgId": "team_xxxx", "projectId": "prj_xxxx" }
```

### Set environment variables in Vercel

**[vercel.com/dashboard](https://vercel.com/dashboard) → purchase-system → Settings → Environment Variables**

Add every variable from the table above. For environment-specific values:

| Variable | Preview value | Production value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase URL | Production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key | Production service role key |
| `NEXT_PUBLIC_APP_URL` | `https://purchase-system-git-main.vercel.app` | Your production domain |
| All others | Same across environments | Same across environments |

### Add GitHub Actions secrets

**[github.com/CBaney-IG/PurchaseSystem/settings/secrets/actions](https://github.com/CBaney-IG/PurchaseSystem/settings/secrets/actions)**

| Secret name | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

### Deployment flow

```
Push to any branch  →  Vercel creates a preview URL automatically
PR opened           →  GitHub Actions: type-check → lint → tests → Vercel preview
Merge to main       →  GitHub Actions: type-check → lint → tests → Vercel production deploy
```

### Manual deploy (without CI)

```bash
vercel                  # deploy to preview
vercel --prod           # deploy to production
```

---

## Development Workflow

```bash
npm run dev          # Local dev server (https://localhost:3003)
npm run build        # Production build
npm run lint         # ESLint + Prettier
npm run type-check   # TypeScript strict check
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run db:migrate   # Run pending Supabase migrations
npm run db:reset     # Reset local DB and re-seed
```

**Feature loop:**
1. `/project-status` — orient at the start of every session
2. `/new-feature F-XXX` — create branch and load context
3. Develop → `/validate` — check against PRD, architecture, security
4. `/commit-feature` — update docs and commit
5. Push → open PR → Vercel preview → merge to main

---

## Docker

```bash
# Build and run the full stack (app + local Postgres)
docker compose up --build

# App runs at http://localhost:3003
```

> For day-to-day development, `supabase start` + `npm run dev` is the recommended approach. Docker compose is useful for testing the production build locally or running in a CI environment without Supabase CLI.

The `docker/Dockerfile` uses a multi-stage build (deps → builder → lean runner on `node:20-alpine`).

---

## Project Structure

> This structure is created during F-001 (project scaffolding). Until F-001 is run, only `docs/`, `docker/`, and root config files exist.

```
app/              # Next.js App Router — pages and API routes
  (auth)/         # Login + OAuth callback
  (dashboard)/    # All protected routes (requests, approvals, admin)
  api/            # API routes (approvals, webhooks, admin)
components/       # shadcn/ui components + feature components
lib/
  supabase/       # Browser, server, and service-role clients
  approvals/      # processApproval() — core approval routing engine
  notifications/  # Email token signing + Resend helpers
  snowflake/      # Webhook retry logic
hooks/            # Custom React hooks
types/            # TypeScript domain types + Zod schemas
emails/           # React Email templates
supabase/
  migrations/     # SQL migration files
  seed/           # Development seed data
docker/           # Dockerfile
docs/             # Architecture, product, and development documentation
.github/
  workflows/      # GitHub Actions CI/CD
```

---

## Documentation

| Doc | Purpose |
|---|---|
| [PRD](docs/product/PRD.md) | Product requirements, user personas, success metrics |
| [User Stories](docs/product/user-stories.md) | Feature stories with acceptance criteria (AC-01–AC-10) |
| [Architecture Overview](docs/architecture/overview.md) | System diagram, data flow, auth flow |
| [Database Schema](docs/architecture/database.md) | All 13 tables with full SQL and RLS policies |
| [API Contracts](docs/architecture/api-contracts.md) | Every endpoint, Server Action, and webhook spec |
| [Security](docs/architecture/security.md) | Auth, entity isolation, POPIA, ISO 27001 mapping |
| [Tech Stack](docs/architecture/tech-stack.md) | Stack decisions, rationale, and swap guides |
| [ADR-001](docs/architecture/decisions/001-initial-stack.md) | Initial stack decision record |
| [Feature Backlog](docs/development/backlog.md) | 20 features across 7 phases (~40 dev days) |
| [Current Phase](docs/development/current-phase.md) | What's in progress and what's next |
| [Environments](docs/development/environments.md) | Full local, staging, and production setup guide |
| [Git Workflow](docs/development/git-workflow.md) | Branching strategy and commit conventions |

---

## Key Constraints

- **Auth:** Azure AD SSO only — email/password is disabled in Supabase Auth
- **Stack:** Fixed per PRD — Next.js 15, Supabase, Vercel Pro (see ADR-001 for rationale)
- **No third-party approval SaaS:** No ApprovalMax, Expensify, or equivalent
- **Snowflake:** REST/webhook integration only — no direct database connector
- **Compliance:** POPIA (South Africa) + ISO 27001 alignment
- **Currency:** ZAR default
