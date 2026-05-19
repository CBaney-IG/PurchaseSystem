---
description: Design the technical architecture based on the PRD. Creates architecture docs, database schema, and API contracts.
---

# Initialize Architecture

Design the technical architecture. This must be done AFTER `/init-product`. Optionally also after `/init-design-system` — if the user ran it, the design intent will inform component-library and design-token decisions here.

## Stack flexibility
The default stack is **Next.js + TypeScript + Supabase + Vercel + Tailwind + Vitest + Playwright + Zod** (see @docs/architecture/tech-stack.md). At step 2 below, ask the user whether to stick with the default or deviate. If they deviate (e.g. SvelteKit instead of Next.js, raw Postgres instead of Supabase, Fly.io instead of Vercel), then in step 3 also **update @docs/architecture/tech-stack.md** to reflect the new choices, and **update @CLAUDE.md** if the "Default stack" line there now misrepresents reality.

## Step 1: Load product context
Read @docs/product/PRD.md, @docs/product/user-stories.md, and @docs/development/backlog.md.

Also check @docs/product/design-system.md — if it has been populated (i.e. not still in `Status: Draft`), read it; the design intent will inform component-library and Tailwind theme decisions in step 2. If it's still a draft, that's fine — the user opted to defer; flag it as "design decisions to be made during feature development" and proceed.

Summarize: "I've reviewed the product requirements. Here's what I understand we're building: [summary]"

## Step 2: Propose high-level architecture
**First, confirm the stack.** Ask: "The default stack is Next.js + Supabase + Vercel. Does that fit, or do you want to deviate (e.g. different DB, different host, different framework)?" Capture the answer — it determines the rest of this step and what F-001 will scaffold.

Based on the PRD (and design-system.md, if populated), propose:
- **Stack confirmation** (default or customized — record any deviations)
- **Pages/routes** needed (App Router structure or equivalent)
- **Data model** (entities, relationships)
- **API endpoints** (if any beyond framework-native server actions)
- **Auth approach** (provider, methods, roles)
- **Third-party integrations** (if any)
- **Component library / design tokens** (informed by design-system.md if present — e.g. shadcn/ui vs MUI vs custom; Tailwind theme config; shared UI primitives)

Present this as a clear proposal. Explain tradeoffs where relevant.
Ask: "Does this approach make sense? Any changes before I document it?"

## Step 3: Document the architecture
After user approval, generate/update these files:
- @docs/architecture/overview.md — component diagram, data flow, key decisions
- @docs/architecture/database.md — full schema with table definitions
- @docs/architecture/api-contracts.md — endpoint specs
- @docs/architecture/security.md — auth, authorization, data protection
- @docs/architecture/tech-stack.md — **only if the user deviated from the default stack** in step 2; update the table and rationale to match what was chosen, and add or update swap guides if relevant
- @CLAUDE.md — **only if the stack changed**; update the "Default stack" line under "Tech Stack" so it reflects reality

## Step 4: Create first ADR
Create @docs/architecture/decisions/001-initial-stack.md documenting the stack choice (Next.js, Supabase, Vercel) and why.

## Step 5: Refine user stories and backlog
- **@docs/product/user-stories.md** — first, check the file's state:
  - If it contains real stories, revisit each one and add technical acceptance criteria discovered during architecture (e.g. specific API endpoint, validation rules, RLS-enforced authorization).
  - If it's still in its raw template state (contains placeholders like `## Feature 1: [Name]`, `**As a** [persona]`, or `[Specific, testable criterion]`), this means `/init-product` did not generate stories. Generate them now from the PRD: one user story per core MVP feature, using the primary persona (or the appropriate secondary persona for role-specific features), with 3-4 specific testable acceptance criteria each — then layer the technical acceptance criteria from the architecture work on top.

  Either way, present the result to the user for review and wait for confirmation before considering this step done. These refined acceptance criteria are what `/validate` checks against later.
- **@docs/development/backlog.md** — refine phase breakdown based on architecture decisions. Add technical dependencies (e.g. "F-007 depends on F-005 because the comments table references posts").

## Step 6: Handoff note
"✅ Architecture documented. Key files:
- Overview: docs/architecture/overview.md
- Database: docs/architecture/database.md
- API contracts: docs/architecture/api-contracts.md
- Security: docs/architecture/security.md

**These docs are the source of truth.** Any human or AI agent can read them to understand how to build this system.

**Next step: scaffold the project.** Run `/new-feature F-001` to pick up the first backlog item — this scaffolds the chosen stack (creates `package.json`, `src/`, configuration files, and any database/migration setup). After F-001 is committed, the project is a real, runnable app and `npm install` / `npm run dev` will work."
