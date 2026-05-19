# [PROJECT_NAME]

> [One-line product description — update after running `/init-product`]

## Prerequisites

Before you begin, make sure you have these installed on your machine:

1. **A code editor** — [VS Code](https://code.visualstudio.com/) recommended (has a Claude Code extension)
2. **Node.js 18+** — download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
   - To check: run `node --version` in your terminal
3. **Git** — download from [git-scm.com](https://git-scm.com/)
   - To check: run `git --version` in your terminal
4. **Claude Code** — install with `npm install -g @anthropic-ai/claude-code`
   - Requires a Claude Pro, Max, or API subscription

You'll also need free accounts on:
- [Supabase](https://supabase.com) — database and authentication
- [Vercel](https://vercel.com) — hosting and preview deployments
- [GitHub](https://github.com) — code repository

## Getting Started (Step by Step)

> **About the template:** This repository is a **scaffolding kit**, not a runnable app. There's no `package.json`, no `src/`, and no database migrations yet — those are created during scaffolding (Step 7 below). The default stack is Next.js + Supabase + Vercel, but you can customize it during `/init-architecture`. See [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) for swap guides.

### Step 1: Get the template into a new repository

Pick **one** of the two approaches below. Approach A is recommended — it gives you a clean new repo on GitHub with no link to the template's history.

#### Approach A — GitHub "Use this template" _(recommended)_

1. On GitHub, open the template: **[claude-code-project-template](https://github.com/adamstockdenIG/claude-code-project-template)**.
2. Click **"Use this template"** → **"Create a new repository"**, name it, set visibility, and create.
3. Clone *your new repo* (not the template) to your machine:
   ```bash
   git clone https://github.com/[your-username]/[your-repo].git
   cd [your-repo]
   ```

✅ You now have all the template files locally, in a fresh repo with one initial commit. **Skip to Step 2.**

#### Approach B — Clone and detach _(no GitHub, or you want a different host)_

```bash
# 1. Clone the template
git clone https://github.com/adamstockdenIG/claude-code-project-template.git my-project
cd my-project

# 2. Detach from the template's git history and start a fresh one
rm -rf .git          # Windows PowerShell: Remove-Item -Recurse -Force .git
git init
git add -A
git commit -m "chore: initial project template"

# 3. (Optional, when you have a remote ready) push to your own repo:
# git remote add origin [your-repo-url]
# git push -u origin main
```

✅ You now have all the template files locally, in a fresh repo with one initial commit and no remote linked yet.

### Step 2: Open the project in VS Code

Open the project folder: `File → Open Folder…` (or run `code .` from the terminal).

> **💡 Tip — use VS Code's integrated terminal.** Open it with `` Ctrl+` `` (Windows/Linux) or `` Cmd+` `` (macOS). Every terminal command below can run inside it, so you stay in one window: editing files, running commands, and chatting with Claude Code.

### Step 3: Open Claude Code

You have two ways to interact with Claude Code — both work identically and use the same slash commands. **VS Code is recommended** because it auto-includes any file you have open as context.

**Option A — VS Code panel (recommended):**
- Open the Claude Code panel: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) → type **"Claude Code: Open"** and press Enter.
- Or click the Claude Code icon in the VS Code activity bar (left sidebar).
- Type slash commands or natural-language prompts directly in the panel.

**Option B — Terminal:**
- In your terminal (or VS Code's integrated terminal), run `claude` from the project folder.
- Type slash commands at the prompt.

Either way, Claude reads [CLAUDE.md](CLAUDE.md) at session start and knows your project context.

### Step 4: Define the product (~10 minutes)
```
/init-product
```
Plan-mode interview. Captures product overview, personas, user journeys, and success metrics. Generates [docs/product/PRD.md](docs/product/PRD.md), [docs/product/user-stories.md](docs/product/user-stories.md), and [docs/development/backlog.md](docs/development/backlog.md). You'll review the drafts before any file is written.

### Step 5: Capture design direction (optional, ~5 minutes)
```
/init-design-system
```
Plan-mode interview covering brand voice, visual direction, and interaction principles. Generates [docs/product/design-system.md](docs/product/design-system.md). Skip this if you'd rather decide design as you build — there's no penalty for deferring, and you can run it later.

### Step 6: Design the architecture (~15 minutes) — _the stack is chosen here_
```
/init-architecture
```
Designs schema, API contracts, security model, and component-library choice based on your PRD (and design-system, if you ran it). Refines user stories with technical acceptance criteria. Generates the docs under [docs/architecture/](docs/architecture/).

> **The default stack is Next.js + Supabase + Vercel.** If your project needs a different stack (e.g. Postgres on Fly.io instead of Supabase, or SvelteKit instead of Next.js), say so during this step — the architecture proposal will reflect your choice and [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) will be updated. The remaining setup steps below assume the default stack; **adapt them to whatever architecture chose**.

### Step 7: Scaffold the project — `/new-feature F-001`
```
/new-feature F-001
```
This is the first backlog item: "Project scaffolding". Claude creates a branch, scaffolds the chosen stack (creates `package.json`, `src/`, configuration files, and — for the default stack — `supabase/migrations/`, `.env.example`, etc.), and walks you through the setup.

**After F-001 is committed and merged, the project is a real, runnable app.** From here on, `npm` commands work and the remaining setup steps make sense.

### Step 8: Create your Supabase projects _(only if architecture chose Supabase)_
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create two projects (free tier is fine):
   - **[your-project]-preview** — for development and testing
   - **[your-project]-production** — for live users (can create later)
3. For each project, go to Settings → API Keys and note the **Project URL**, **publishable key**, and **secret key**

> **Legacy naming note:** Older Supabase docs and tutorials refer to the **anon key** (now called the **publishable key**) and the **service_role key** (now called the **secret key**) — they map 1:1, so anywhere older guides say "anon key", use the publishable key, and anywhere they say "service_role key", use the secret key.

### Step 9: Set up environment variables _(adapt to your chosen stack)_
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in your **preview** project credentials. For the default Supabase stack:
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-preview-project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[your-preview-publishable-key]
SUPABASE_SECRET_KEY=[your-preview-secret-key]
```

### Step 10: Install dependencies and start
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Step 11: Connect to Vercel _(only if architecture chose Vercel)_
```bash
npx vercel link
```
In the [Vercel dashboard](https://vercel.com/dashboard), set environment variables:
- **Preview** environment → your preview Supabase credentials
- **Production** environment → your production Supabase credentials

### Step 12: Build the rest of the backlog
```
/new-feature F-002
```
Continue with F-002, F-003, etc. via `/new-feature [F-XXX]`. See "Working with Claude Code" below for the full feature loop.

## Working with Claude Code

This project is set up for agentic development. Every session, Claude reads `CLAUDE.md` and knows your project context. Commands are grouped by lifecycle phase:

### Setup (one-time, when starting a new project)
| Command | When to Use |
|---------|-------------|
| `/init-product` | Phase 1 — plan-mode interview that produces PRD, user stories, backlog |
| `/init-design-system` _(optional)_ | Between phase 1 and 2 — capture visual direction and interaction principles |
| `/init-architecture` | Phase 2 — design schema, API contracts, security model from the PRD |

### Day-to-day (every feature)
| Command | When to Use |
|---------|-------------|
| `/project-status` | Start of any new session — get oriented |
| `/new-feature [F-XXX]` | Begin work on a backlog item (creates branch, loads context) |
| `/validate` | Check work against product, architecture, and security requirements |
| `/commit-feature` | Wrap up, update docs, and commit |
| `/hotfix [issue]` | Urgent production fix (skips the new-feature ceremony) |

**The three-phase view:**

1. **Discovery** — `init-product` (and optionally `init-design-system`)
2. **Architecture** — `init-architecture`
3. **Feature development (per feature)** — `project-status` → `new-feature` → develop → `validate` → fix → `validate` → `commit-feature` → push + PR

## Documentation

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | Instructions Claude reads at the start of every session |
| [Tech Stack](docs/architecture/tech-stack.md) | Current technology choices and swap guides |
| [PRD](docs/product/PRD.md) | What we're building and why |
| [User Stories](docs/product/user-stories.md) | Per-feature stories with acceptance criteria |
| [Design System](docs/product/design-system.md) | Visual direction, brand voice, interaction principles _(optional)_ |
| [Architecture](docs/architecture/overview.md) | How the system is designed |
| [Database](docs/architecture/database.md) | Data model and schema |
| [API Contracts](docs/architecture/api-contracts.md) | Endpoint specifications |
| [Security](docs/architecture/security.md) | Security requirements (ISO 27001 aligned) |
| [Backlog](docs/development/backlog.md) | Feature list with priorities, phases, dependencies |
| [Current Phase](docs/development/current-phase.md) | What's in progress and what's next |
| [Git Workflow](docs/development/git-workflow.md) | Branching, commits, and rollback |
| [Environments](docs/development/environments.md) | Dev / preview / production setup |

## Tech Stack

See [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) for full details and swap guides.

Current defaults: Next.js 14+ (App Router), TypeScript (strict), Supabase (PostgreSQL + Auth), Vercel (hosting), Tailwind CSS (styling), Vitest (unit tests), Playwright (e2e tests), Zod (validation).

## License

[Choose a license]
