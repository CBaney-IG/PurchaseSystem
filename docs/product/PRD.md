# Product Requirements Document

> **Status:** Draft — run `/init-product` to fill this out interactively.

## Product Overview

**Name:** [Product name]
**One-liner:** [What it does in one sentence]
**Target user:** [Who uses this and what problem it solves for them]

## Problem Statement

[What pain point does this product address? Why does it need to exist?]

## Core Features (MVP)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | | | Must-have |
| 2 | | | Must-have |
| 3 | | | Must-have |
| 4 | | | Nice-to-have |
| 5 | | | Nice-to-have |

## Out of Scope (MVP)

[What this product explicitly does NOT do in the first version. This prevents scope creep.]

- [ ] ...
- [ ] ...

## User Personas

### Primary: [Name/Role]
- **Context:** [When and where they use this]
- **Goals:** [What they want to achieve]
- **Frustrations:** [What's hard about current solutions]

### Secondary: [Name/Role] _(optional — duplicate this block per secondary persona, or remove the heading entirely if there's only one user type)_
- **Context:** [When and where they use this]
- **Goals:** [What they want to achieve]
- **Frustrations:** [What's hard about current solutions]
- **Differs from primary:** [What this persona does that the primary user doesn't, or vice versa]

## User Flows

### Flow 1: [Core flow name]
1. User does X
2. System responds with Y
3. User sees Z

## Success Metrics

- [ ] [How do we know this is working? e.g., "Users can complete core flow in under 2 minutes"]

## Design Preferences

- [ ] Mobile-first / Desktop-first / Responsive
- [ ] Minimal / Feature-rich / Dashboard-style
- [ ] Brand colors / style references: [link or description]

> For full visual direction, brand voice, and interaction principles, see [design-system.md](design-system.md) (populated by the optional `/init-design-system` step).

## Reference Products / Mental Model

[Existing products this is similar to, and *what specifically* makes them comparable. This is positioning context, not design references — e.g. "like Notion but scoped to engineering teams" or "Slack-style channel UI but async-first". Helps anyone reading this PRD form a quick mental model.]

- [Product] — [what makes it a useful reference]
- [Product] — [what makes it a useful reference]

## Constraints

- **Timeline:** [Target date or timeframe]
- **Compliance:** ISO 27001 alignment (documented in docs/architecture/security.md)
- **Technical:** Next.js, Supabase, Vercel (documented in docs/architecture/overview.md)
