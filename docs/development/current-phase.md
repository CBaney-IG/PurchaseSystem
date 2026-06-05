# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 1 — Foundation (in progress)
**Phase goal:** Project scaffolding, auth, full database schema with RLS, user/entity admin UI. Nothing user-facing beyond auth.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|---|---|---|---|---|
| F-002 | Azure AD SSO | — | ⏸ Blocked | Waiting on Azure AD credentials from IT Director |
| F-003 | Full database schema + RLS | — | 📋 Ready | Can proceed — email/password auth is working |

## Last Session Summary

**Date:** 2026-06-05
**What was done:**
- F-001 scaffolding complete and merged to main
- Next.js 15 project structure, all config files, Supabase clients, TypeScript types
- Login page with email/password (dev) + disabled Microsoft button (prod)
- Dashboard layout with minimal sidebar (all nav links, sign-out, active state)
- Minimal migration: entities + profiles tables + handle_new_user trigger + RLS
- Email/password auth enabled in local Supabase config for test users
- GitHub repo live at CBaney-IG/PurchaseSystem; branch protection configured
- Supabase CLI init, config.toml tuned for project

**What's next:**
- F-002 (Azure AD SSO) — BLOCKED waiting on IT Director credentials
- F-003 (Full database schema) — READY to start; skip ahead of F-002

**Open questions / blockers:**
- Azure AD credentials (AZURE_AD_TENANT_ID, CLIENT_ID, CLIENT_SECRET) — IT Director
- Snowflake endpoint URL — Data team (needed for F-014)
- Resend API key — needed for F-010 (email notifications)
- Supabase staging/production projects — create at supabase.com before Vercel setup

## Session History

| Date | Summary | Key Decisions |
|---|---|---|
| 2026-06-05 | F-001 scaffolded and merged. App is runnable locally. | Email/password for dev; Azure AD deferred to F-002; minimal schema in F-001 migration |
| 2026-06-01 | Architecture phase complete. All docs written. | Next.js 15 fixed stack; Azure AD SSO only; https://localhost:3003; single spend_requests table for PRs + expenses |
