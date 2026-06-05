# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 1 — Foundation (ready to start)
**Phase goal:** Project scaffolding, Azure AD SSO, full database schema with RLS, user/entity admin UI. Nothing user-facing beyond auth.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| — | — | — | — | Architecture complete; F-001 is the next action |

## Last Session Summary

**Date:** 2026-06-01
**What was done:**
- PRD and user stories written from BRS-USMP-001 and FRS-USMP-001
- Feature backlog populated with 20 items across 7 phases (~40 dev day estimate)
- Architecture confirmed: Next.js 15, Supabase, Azure AD SSO, shadcn/ui + Tailwind CSS v4
- All four architecture docs written (overview, database schema, API contracts, security)
- ADR-001 created documenting the stack decision
- Tech stack doc updated to reflect Next.js 15 and full dependency list
- Environments doc updated with correct local URL (https://localhost:3003) and full variable list
- CLAUDE.md updated with correct project name and stack description

**What's next:**
- Run `/new-feature F-001` to scaffold the project (Next.js 15 init, Supabase CLI init, Docker, GitHub Actions, shadcn/ui, all core dependencies)
- Once F-001 is merged: `npm install` and `npm run dev` will work

**Open questions / blockers:**
- Azure AD app registration credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — needed from IT Director before F-002 (auth) can be fully tested
- Snowflake endpoint URL and webhook secret — needed from Data team before F-014 (Snowflake integration) can be tested
- Resend API key — needed before F-010 (email notifications) can be tested
- Production domain / Vercel project name — needed before Vercel setup

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
