# Environment Setup

## Prerequisites

- **Node.js** 18+ (recommended: use nvm to manage versions)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **Supabase account** (free tier is fine for MVP) — supabase.com
- **Vercel account** (free tier is fine for MVP) — vercel.com
- **GitHub account** (for repository hosting)

## Environments

| Environment | Purpose | Database | Deployed To |
|-------------|---------|----------|-------------|
| **Local** | Development & debugging | Points to Preview Supabase | localhost:3000 |
| **Preview** | QA / testing / demos | Preview Supabase project | Vercel preview URL |
| **Production** | Live users | Production Supabase project | Vercel production URL |

> **Why local points to the Preview database:** This keeps things simple for MVP. You don't need Docker or a local Supabase instance. If you need isolated local data later, you can add Supabase CLI with `supabase start` for a local Docker-based DB.

## Initial Setup

### 1. Clone and install
```bash
git clone [your-repo-url]
cd [project-name]
npm install
```

### 2. Create Supabase projects
Create two projects in Supabase:
- **[project-name]-preview** (for dev + preview environments)
- **[project-name]-production** (for production only)

### 3. Set up environment variables

Copy the example env file:
```bash
cp .env.example .env.local
```

Fill in your Preview Supabase credentials (from Supabase dashboard → Settings → API Keys):
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-preview-project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[your-preview-publishable-key]
SUPABASE_SECRET_KEY=[your-preview-secret-key]
```

> **Legacy naming:** Supabase renamed `anon key` → `publishable key` and `service_role key` → `secret key`. They are functionally identical — older docs and tutorials referencing the old names still apply, just use the new variable names above.

> ⚠️ Never commit `.env.local` — it's in `.gitignore`.

### 4. Set up Vercel

```bash
npx vercel link
```

In the Vercel dashboard, set environment variables:
- **Preview** environment: Use Preview Supabase credentials
- **Production** environment: Use Production Supabase credentials

### 5. Run database migrations

```bash
npm run db:migrate
```

### 6. Start development

```bash
npm run dev
```

Open http://localhost:3000

## Environment Variable Reference

| Variable | Description | Where Used |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key, safe for client (formerly `anon key`) | Client + Server |
| `SUPABASE_SECRET_KEY` | Supabase admin key, server only (formerly `service_role key`) | Server only |

## Promoting to Production

1. Merge PR to `main`
2. Vercel auto-deploys to production
3. Production uses its own Supabase project (set via Vercel env vars)

## Seed Data & Test Accounts

When you first set up, the database is empty. To have something to work with:

### Seed script
Create a seed file at `supabase/seed.sql` with sample data for development. Run it with:
```bash
npm run db:seed
```

This script should create:
- A test user account (use a consistent email like `dev@example.com` so you don't need to sign up each time)
- Sample data for each core entity in your schema
- Enough data to test pagination, filtering, and edge cases

### Guidelines for seed data
- Never include real personal data — use obviously fake names and emails
- Keep seed data small (10-20 records per table is plenty for dev)
- Make sure seed data respects all foreign key relationships
- Include at least one example of each user role (e.g., admin + regular user)
- Document test account credentials in this file (dev environments only — never in production)

### Test accounts for preview environment
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| dev@example.com | [set during seed] | admin | Full access testing |
| user@example.com | [set during seed] | user | Standard user testing |

> ⚠️ These accounts are for the preview environment only. Production should never have seeded test accounts.

## Troubleshooting

**"Cannot connect to Supabase"**
→ Check `.env.local` has correct URL and keys from your Preview project

**"Migration failed"**
→ Check the SQL syntax in `supabase/migrations/`. Run against Preview project first.

**"Build fails on Vercel but works locally"**
→ Check Vercel environment variables match what's in `.env.local`
