# Feature Backlog

> **Source of truth for what to build and in what order.**
> Updated after every completed feature. Dependencies determine build order within each phase.
> Run `/project-status` to see what's next.

## How to Read This

- **Priority:** P0 (must-have MVP), P1 (should-have MVP), P2 (post-MVP)
- **Status:** 📋 Backlog → 🔨 In Progress → ✅ Done → ❌ Cut
- **Dependencies:** Items that must be completed first (by ID)
- **Phase:** Which development phase this belongs to

---

## Phase 1: Foundation
> Goal: Project scaffolding, auth, and core data model. Nothing user-facing yet.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-001 | Project scaffolding (per architecture decisions — default: Next.js + Supabase + Vercel) | P0 | 📋 | — | | |
| F-002 | Authentication (sign up, sign in, sign out) | P0 | 📋 | F-001 | | |
| F-003 | User profiles table + RLS policies | P0 | 📋 | F-002 | | |
| F-004 | Environment config (dev/preview/prod) | P0 | 📋 | F-001 | | |

## Phase 2: Core Features
> Goal: Build the primary user-facing features defined in the PRD.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-005 | [Core feature 1 — from PRD] | P0 | 📋 | F-003 | | |
| F-006 | [Core feature 2 — from PRD] | P0 | 📋 | F-003 | | |
| F-007 | [Core feature 3 — from PRD] | P0 | 📋 | F-005 | | |

## Phase 3: Polish & QA
> Goal: Error handling, edge cases, performance, and user experience refinement.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-008 | Error handling & loading states | P1 | 📋 | Phase 2 | | |
| F-009 | Form validation (client + server) | P1 | 📋 | Phase 2 | | |
| F-010 | Security hardening review | P1 | 📋 | Phase 2 | | |
| F-011 | Performance audit | P2 | 📋 | Phase 2 | | |

## Phase 4: Post-MVP
> Goal: Features that enhance but aren't critical for launch.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-012 | [Nice-to-have 1] | P2 | 📋 | Phase 3 | | |
| F-013 | [Nice-to-have 2] | P2 | 📋 | Phase 3 | | |

---

## Bugs

> Track bugs found during development here. Prefix IDs with B-.

| ID | Bug | Severity | Status | Found In | Branch | Fixed |
|----|-----|----------|--------|----------|--------|-------|
| | | | | | | |

---

## Decisions Log

> Quick reference for decisions made during development that aren't big enough for an ADR.

| Date | Decision | Context |
|------|----------|---------|
| | | |
