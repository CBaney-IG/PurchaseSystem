---
description: Get up to speed on current project status. Use this at the start of any new session.
---

# Project Status

Help the user (or a new AI agent) get oriented quickly. Read and summarize:

## Step 1: Git state
Run `git branch` to show current branch.
Run `git status` to show working tree state.
Run `git log --oneline -5` to show recent commits.

Summarize: "You're on branch `X` with Y uncommitted changes. Last commit was: Z"

## Step 2: Product context
Read @docs/product/PRD.md (overview, features, personas) and @docs/product/user-stories.md.
Summarize in one or two sentences: "This is [product name]: [one-liner]. Primary user: [persona]."

If the PRD still says `Status: Draft` — flag it. The project hasn't been through `/init-product` yet; recommend running that first before anything else.

## Step 3: Current phase
Read @docs/development/current-phase.md
Summarize what phase we're in and what's in progress.

## Step 4: Backlog snapshot
Read @docs/development/backlog.md
Show the next 3-5 prioritized items that are ready to work on.

## Step 5: Any blockers
Check for:
- Uncommitted work that might be from a previous session
- Failing tests (`npm run test` — quick run, only if `package.json` exists; skip if F-001 hasn't been done yet)
- Any TODO or FIXME comments in recently changed files

## Step 6: Recommendation
Based on the above, suggest what to do next:
"📍 **Suggested next action:** [description]
   Run `/new-feature [name]` to get started, or tell me what you'd like to work on."
