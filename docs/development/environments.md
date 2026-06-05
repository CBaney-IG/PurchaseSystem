# Environment Setup

## Prerequisites

| Tool | Required Version | Install / Verify |
|---|---|---|
| **Node.js** | v20 LTS or later | `node --version` |
| **npm** | v10 or later | `npm --version` |
| **Git** | v2.40+ | `git --version` |
| **Docker Desktop** | v4.30+ | `docker --version` |
| **VS Code** | Latest stable | `code --version` |
| **Supabase CLI** | v1.200+ | `supabase --version` (install: `npm install -g supabase`) |
| **Vercel CLI** | Latest | `vercel --version` (install: `npm install -g vercel`) |

## Environments

| Environment | Branch | URL | Supabase Project |
|---|---|---|---|
| **Local** | `feature/*` | https://localhost:3003 | Local Supabase (`supabase start`) |
| **Preview / Staging** | Any PR | Auto-generated Vercel URL | Staging Supabase project |
| **Production** | `main` (merged) | Vercel Production URL | Production Supabase project |

> **Why local uses its own Supabase instance:** The USMP has complex RLS policies, triggers, and seed data. Using a shared staging database for local dev risks polluting test data. Run `supabase start` to spin up a local PostgreSQL + Auth instance via Docker.

## Initial Setup

### 1. Clone and install
```bash
git clone https://github.com/CBaney-IG/PurchaseSystem.git
cd PurchaseSystem
npm install
```

### 2. Initialise local Supabase
```bash
# Start local Supabase stack (requires Docker Desktop running)
supabase start

# Output includes:
#   API URL:     http://localhost:54321
#   Studio URL:  http://localhost:54323  (local DB GUI)
#   Anon key:    eyJhbGci...
#   Service key: eyJhbGci...

# Apply all migrations and seed data
supabase db reset
```

### 3. Set up environment variables
```bash
cp .env.example .env.local
```

Fill in `.env.local` with values from `supabase start` output and credentials from your team:

```bash
# Local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service key from supabase start>

# Azure AD SSO (get from IT Director)
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=

# Email (get Resend API key from resend.com)
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=noreply@bpogroup.co.za

# Snowflake integration (get from Data team)
SNOWFLAKE_WEBHOOK_SECRET=<generate a 64-char random string for local>
SNOWFLAKE_ENDPOINT_URL=<provided by data team>

# App URL — must match exactly
NEXT_PUBLIC_APP_URL=https://localhost:3003

# Email token signing (generate a 64-char random string)
EMAIL_ACTION_SECRET=<64-char random string>
```

> ⚠️ Never commit `.env.local` — it is in `.gitignore`. All production secrets are managed in the Vercel dashboard.

### 4. Azure AD OAuth redirect URI (local dev)
Add `https://localhost:3003/auth/callback` as a redirect URI in the Azure App Registration used for development. Ask the IT Director for access to the 'USMP Development' app registration.

### 5. Start local dev server
```bash
# HTTPS is required to match Azure AD redirect URI configuration
npm run dev
# which runs: next dev --experimental-https --port 3003
```

Open **https://localhost:3003** — accept the browser's self-signed certificate warning on first run.

### 6. VS Code extensions (required)
- ESLint (Microsoft)
- Prettier — Code Formatter
- Tailwind CSS IntelliSense (Tailwind Labs)
- Supabase (Supabase)
- GitLens (GitKraken)
- Docker (Microsoft)

## Environment Variable Reference

| Variable | Description | Where Used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (safe for browser) | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server only, bypasses RLS** | Server API routes only |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID for OAuth | Server |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID | Server |
| `AZURE_AD_CLIENT_SECRET` | Azure AD app client secret | Server |
| `RESEND_API_KEY` | Resend API key for transactional email | Server |
| `RESEND_FROM_EMAIL` | From address for outbound email | Server |
| `SNOWFLAKE_WEBHOOK_SECRET` | Shared secret validating Supabase → USMP webhooks | Server |
| `SNOWFLAKE_ENDPOINT_URL` | Snowflake data pipeline endpoint URL | Server |
| `NEXT_PUBLIC_APP_URL` | Full public URL of this environment | Client + Server |
| `EMAIL_ACTION_SECRET` | HMAC key for signing email approval JWT tokens | Server |

## Seed Data

`supabase db reset` runs all migrations then the seed file at `supabase/seed/seed.sql`.

The seed creates:
- One DEFAULT entity (`BPO-DEFAULT`)
- One test entity (`BPO-OPS`)
- One user of each role (Azure AD emails — must exist in your dev tenant)
- A full DOA matrix with the indicative thresholds from BRS §5.2
- Sample cost centres, budgets, and vendor catalogue entries
- 3 sample spend requests in various statuses

> ⚠️ Seed data uses obviously fake names. Never include real employee data in seed files. Never run seed against production.

## Vercel Setup (first-time)

### 1. Authenticate and link

```bash
# Install the CLI if not already installed
npm install -g vercel

# Authenticate using your GitHub account
vercel login

# Link the project (run from the PurchaseSystem root)
vercel
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → select your Vercel account or team
- **Link to existing project?** → No (first time)
- **Project name** → `purchase-system`
- **In which directory is your code?** → `./`

Vercel will do a first deployment to a preview URL. Ignore the output URL for now.

### 2. Get your project IDs (needed for GitHub Actions)

```bash
cat .vercel/project.json
# Output: { "orgId": "team_xxxx", "projectId": "prj_xxxx" }
```

Add these to GitHub Secrets at
`https://github.com/CBaney-IG/PurchaseSystem/settings/secrets/actions`:

| Secret name | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create token |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

### 3. Set environment variables in the Vercel dashboard

**vercel.com/dashboard → purchase-system → Settings → Environment Variables**

Add each variable from the Environment Variable Reference table above.
Split environment-specific values across Preview and Production:

| Variable | Preview | Production |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase URL | Production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key | Production service role key |
| `NEXT_PUBLIC_APP_URL` | `https://purchase-system-git-main.vercel.app` | Your production domain |
| All other variables | Same value in both | Same value in both |

> **Note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Use the **staging** key in Preview and the **production** key in Production — never mix them.

### 4. Connect the GitHub repository

**vercel.com → purchase-system → Settings → Git**

- Connect repository: `CBaney-IG/PurchaseSystem`
- Production branch: `main`
- Vercel will now deploy automatically on every push

### 5. Verify the deployment flow

```
Push any branch  →  Vercel creates a preview URL
Open a PR        →  GitHub Actions runs tests  →  Vercel posts preview URL to PR
Merge to main    →  GitHub Actions runs tests  →  Vercel deploys to production
```

The CI pipeline is defined in `.github/workflows/deploy.yml`.
The `test` job (type-check → lint → unit tests) must pass before deployment runs.

### Manual deploy (bypass CI)

```bash
vercel            # deploy current code to a preview URL
vercel --prod     # deploy to production directly
```

## Supabase Production Setup

1. Create a **separate** Supabase project for production (never share with staging)
2. Apply migrations: `supabase db push --project-ref <prod-project-ref>`
3. Verify RLS is enabled on all tables (Table Editor > each table > RLS tab)
4. Configure Azure AD OAuth with the production redirect URI
5. Enable Supabase Realtime on the `notifications` table only
6. Set up DB Webhook: Supabase Dashboard > Database > Webhooks > New Webhook
   - Table: `approval_events`, Event: INSERT
   - URL: `https://<prod-url>/api/webhooks/snowflake-push`
   - Headers: `x-webhook-secret: <SNOWFLAKE_WEBHOOK_SECRET value>`

## Promoting to Production

1. PR approved and merged to `main`
2. Vercel auto-deploys to production URL
3. Production uses its own Supabase project (set via Vercel env vars)
4. Monitor Vercel deployment logs and Supabase dashboard for first 30 minutes

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Browser SSL warning on localhost | Self-signed cert from `--experimental-https` | Accept the warning once; it persists for the browser session |
| Azure AD redirect error | Redirect URI not registered | Add `https://localhost:3003/auth/callback` to Azure App Registration |
| "Cannot connect to Supabase" | Docker not running or `supabase start` not run | Start Docker Desktop, then `supabase start` |
| "Migration failed" | SQL syntax error in migration file | Check `supabase/migrations/` — run `supabase db reset` to retry from scratch |
| Build fails on Vercel but works locally | Missing env var in Vercel dashboard | Check all variables in the Environment Variable Reference table above are set |
| Email links expired | Token >48 hours old or already used | Approver should log in directly to `/approvals` to action the request |
