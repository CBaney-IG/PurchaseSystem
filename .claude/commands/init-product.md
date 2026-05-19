---
description: Interactive product definition session. Use this when starting a brand new project to fill out the PRD, user stories, and initial backlog.
---

# Initialize Product

## Mode
**Enter plan mode at the start of this session and stay in it throughout the interview.** Product discovery is decisions-only — no application code is written here, and the PRD itself is the artifact under discussion. The natural shape:

1. Enter plan mode immediately.
2. Conduct the interview below (read-only operations are fine in plan mode).
3. Draft the PRD, user stories, and backlog content, then present them via `ExitPlanMode` as the proposed plan. **The plan payload MUST explicitly enumerate all three target files and what will be written to each:**
   - `docs/product/PRD.md` — summary of sections being filled
   - `docs/product/user-stories.md` — list of stories being generated (one per Q5 feature)
   - `docs/development/backlog.md` — list of F-005+ entries being added
   If any of these three is omitted from the plan, the plan is incomplete — go back and add it before calling `ExitPlanMode`.
4. Only after the user approves, exit plan mode and write @docs/product/PRD.md, @docs/product/user-stories.md, and @docs/development/backlog.md.

This gives the user a chance to review and redirect the drafts before any file is touched.

## Interview

Walk the user through defining their product. This is a guided interview — ask one question at a time, keep it conversational.

## Introduction
"👋 Let's define your product. I'll ask you some questions to build out the Product Requirements Document, user stories, and initial backlog. You can keep answers short — we'll refine later. Architecture decisions come in a separate step (`/init-architecture`) once we've nailed down what we're building.

There are no wrong answers. If you're unsure about something, say 'skip' and we'll come back to it."

## Questions (ask one at a time, wait for response)

1. **What's the product called?** (working name is fine)
2. **In one sentence, what does it do?** (the elevator pitch)
3. **Who is the primary user?** (be specific — role, situation, pain point)
4. **Are there other user types beyond the primary user?** (conditional — e.g. admins, team leads, content moderators, end-users-of-customers. If "no, just one type", skip to Q5. Otherwise capture each secondary persona briefly: role + what they do that's different from the primary user.)
5. **What are the 3-5 core things a user needs to do?** (the must-have features for MVP)
6. **Walk me through 2-3 key user journeys.** (Concrete sequences of actions, not feature lists. Examples: "first-time user from sign-up to first value moment", "a returning user's typical 5-minute session", "the path an admin takes to handle a flagged item". This catches gaps the feature list misses.)
7. **What should it NOT do?** (scope boundaries — helps prevent creep)
8. **How will you know this is working?** (success metrics — concrete and observable. Examples: "users complete signup in under 2 minutes", "10 daily active users by end of month 1", "support tickets per user drop 30% vs the spreadsheet it replaces". If the user says "I don't know yet", record that — it's a useful signal that metrics need to be revisited.)
9. **Any specific design/UX preferences?** (minimal, dashboard-heavy, mobile-first, etc. Keep this brief — `/init-design-system` is a separate optional command that goes deeper. This question just captures the headline direction for the PRD.)
10. **Are there existing products this is similar to?** (helps establish mental model)
11. **Any hard constraints?** (timeline, budget, compliance, existing systems to integrate with)

## After the interview
"📝 Let me draft your Product Requirements Document..."

Generate the following files using the template structures already in each file:

1. **@docs/product/PRD.md** — fill in every section using interview answers:
   - Product Overview, Problem Statement → from Q1, Q2
   - Core Features (MVP) → from Q5
   - Out of Scope → from Q7
   - User Personas — Primary from Q3, plus a section per secondary persona from Q4 (omit the secondary section entirely if Q4 returned "just one type")
   - User Flows → from Q6, one subsection per journey, numbered steps
   - Success Metrics → from Q8 (if Q8 was "I don't know yet", record that explicitly as `[ ] To be defined — revisit before MVP launch` so it doesn't silently disappear)
   - Design Preferences → from Q9 (one-liner; design-system.md captures full detail if `/init-design-system` is run)
   - Reference Products / Mental Model → from Q10 (positioning context — not the same as design references)
   - Constraints → from Q11
2. **@docs/product/user-stories.md** — generate **one user story per core MVP feature** (from Q5), each with 3-4 specific, testable acceptance criteria. Use the primary persona from Q3 (or the appropriate secondary persona from Q4 if a feature is admin-only or for a specific role). These will be refined with technical detail during `/init-architecture`.
3. **@docs/development/backlog.md** — populate with the core features broken into phases. Phase 1 is foundation (already pre-populated with F-001 through F-004). Add the MVP features as Phase 2 entries (F-005 onwards).

Present all three drafts to the user for review. Make changes based on their feedback.

## Verification (before closing)
Before declaring the command done, verify all three files were actually written with real content. Re-read each one and confirm:

- **@docs/product/PRD.md** — no longer says `Status: Draft`; product name, problem statement, core features, and personas are filled in (no `[Product name]`-style placeholders remaining in the populated sections).
- **@docs/product/user-stories.md** — contains at least one real story per Q5 feature; **no** lingering `## Feature 1: [Name]`, `**As a** [persona]`, or `[Specific, testable criterion]` placeholders from the template.
- **@docs/development/backlog.md** — F-005 onwards have real feature names (no `[Core feature 1 — from PRD]`-style placeholders); Phase 1 (F-001–F-004) is left intact.

If any file is missing, partially written, or still contains template placeholders where real content was expected, **write the missing content now** and re-verify. Do not proceed to the closing message until all three files pass this check.

Then say: "✅ Product defined.

**Optional next step:** if you have a clear sense of the product's look and feel, run `/init-design-system` to capture brand voice, visual direction, and interaction principles. This informs component-library and design-token decisions during architecture. If you'd rather decide design as you build, you can skip it and revisit later — there's no penalty for deferring.

**Required next step:** run `/init-architecture` to design the technical architecture and refine the user stories with technical acceptance criteria."
