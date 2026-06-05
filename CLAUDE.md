# Project: USMP — Unified Spend Management Platform

## What This Is
A governed, auditable spend management platform replacing email-based procurement approvals across BPO Group with a configurable multi-level approval engine and real-time spend intelligence.

## Workflow Phases

Projects built from this template move through three phases. At session start, detect which phase the project is in (using the signals below) and orient the user accordingly. The progression is **advisory, not enforced** — earlier phases produce the inputs that later ones depend on, so skipping is rarely wise, but if the user wants to deviate, surface the trade-off and let them decide.

| Signal | Phase | What to recommend |
|--------|-------|-------------------|
| `[PROJECT_NAME]` placeholder above is unfilled, **or** @docs/product/PRD.md still says `Status: Draft` | **1 — Product discovery** | `/init-product` (runs in plan mode — interview captures the PRD before any code is written) |
| PRD is filled in, but @docs/architecture/database.md still says `Status: Draft` | **2 — Architecture design** | `/init-architecture` (designs schema, API contracts, security model from the PRD). Optional sub-step beforehand: `/init-design-system` to capture visual direction and interaction principles — informs component-library and design-token choices in architecture. Skip if the user prefers to decide design as they build. |
| PRD and architecture docs are populated | **3 — Feature development** | `/project-status` to orient, then `/new-feature F-XXX` for the next backlog item |

**Feature-development inner loop:** `project-status` → `new-feature` → develop → `validate` → `commit-feature` → push + PR. Hotfixes use `/hotfix` and skip `new-feature`.

## Tech Stack
See @docs/architecture/tech-stack.md for full details and swap guides.
**Confirmed stack** (fixed per PRD — see ADR-001): Next.js 15 (App Router), TypeScript (strict), Supabase (PostgreSQL 15 + RLS + Auth), Vercel Pro, shadcn/ui + Tailwind CSS v4, React Query v5, React Hook Form + Zod, Resend, jose, Docker, Vitest, Playwright. **Local dev:** `https://localhost:3003`.

## Key Commands
> **These commands become available after `/new-feature F-001` (project scaffolding).** Until F-001 is done, this template has no `package.json` — `npm` commands will fail. The exact command list depends on the chosen stack; the list below assumes the default Next.js + Supabase stack.

```bash
npm run dev          # Local dev server (points to preview Supabase)
npm run build        # Production build
npm run lint         # ESLint + Prettier
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run db:migrate   # Run pending Supabase migrations
npm run db:reset     # Reset local DB to clean state
```

## Project Structure
> **This structure exists after F-001 scaffolds the project.** Before then, the only real folders are `docs/`, `.claude/`, and the root config files. The structure below assumes the default Next.js stack; a different stack (e.g. SvelteKit) would have a different layout.

```
src/
├── app/             # Next.js App Router pages
├── components/      # React components (colocated tests)
├── lib/             # Shared utilities, Supabase client, types
├── hooks/           # Custom React hooks
└── styles/          # Global styles, Tailwind config
```

## Workflow Rules — READ THESE
1. **Always branch from main.** Never commit directly to main.
2. **Follow the phase workflow.** Use `/new-feature` to start work properly.
3. **All decisions are made by the human.** Present options with pros/cons, then wait.
4. **Update docs when you change things.** Architecture and backlog stay current.
5. **Validate before committing.** Run lint, type-check, and tests before any commit.
6. **Explain what you're doing.** Prefix actions with a short plain-English explanation.
7. **No AI attribution in commits.** Never include "Co-Authored-By" lines, Claude references, or any AI tool attribution in commit messages.

## Documentation (progressive disclosure — read only when needed)
- Tech stack & swap guides: @docs/architecture/tech-stack.md
- Product requirements: @docs/product/PRD.md
- User stories & acceptance criteria: @docs/product/user-stories.md
- Design system (optional): @docs/product/design-system.md
- Architecture overview: @docs/architecture/overview.md
- Architecture decisions: @docs/architecture/decisions/
- Database schema: @docs/architecture/database.md
- API contracts: @docs/architecture/api-contracts.md
- Security requirements: @docs/architecture/security.md
- Feature backlog: @docs/development/backlog.md
- Current phase plan: @docs/development/current-phase.md
- Git workflow: @docs/development/git-workflow.md
- Environment setup: @docs/development/environments.md
