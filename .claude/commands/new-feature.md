---
description: Start a new feature from the backlog. Creates branch, loads context, and walks you through the process.
argument-hint: [feature-name or backlog-item-id]
---

# New Feature Workflow

You are starting a new feature. Follow these steps exactly, explaining each one as you go.

## Step 1: Check git status
Run `git status` to make sure we're on main with a clean working tree.
If not, stop and explain the situation to the user. Let them decide how to proceed.

## Step 2: Pull latest
Run `git pull origin main` to ensure we're up to date.

## Step 3: Identify the feature
If the user provided a backlog item ID, read @docs/development/backlog.md and find it.
If they provided a name, search the backlog for a match.
If no match, ask the user: "This feature isn't in the backlog yet. Should I add it first, or proceed as an ad-hoc task?"

## Step 4: Check dependencies
Review the backlog entry for dependencies. If any dependent features aren't complete, warn the user:
"⚠️ This feature depends on [X] which isn't marked complete. Options:
  A) Work on [X] first
  B) Proceed anyway (may need rework later)
  What would you prefer?"

## Step 5: Create the branch
Create a branch: `git checkout -b feature/$ARGUMENTS`
Tell the user: "✅ Created branch feature/$ARGUMENTS from main."

## Step 6: Check for a user story (and draft one if missing)

Before loading the rest of the context, open @docs/product/user-stories.md and check whether a real story exists for this feature.

Treat the file as **missing a story** if any of these are true:
- It still contains literal template placeholders like `## Feature 1: [Name]`, `**As a** [persona]`, or `[Specific, testable criterion]`
- There is no section whose heading or body references the feature being started (by name or by backlog ID)

If a story is missing, pause and ask the user:
> "I don't see a user story for this feature in user-stories.md. Should I draft one now? (If this is infrastructure work — e.g. project scaffolding, env config — you can skip and proceed without one.)"

If they want one drafted, run a short interview, one question at a time:
1. Which persona is this for? (default to the primary persona from @docs/product/PRD.md)
2. What does the user want to do?
3. Why — what benefit do they get?
4. 3-4 specific, testable acceptance criteria

Then write the story to @docs/product/user-stories.md:
- If the file is still in its raw template state, **replace** the placeholder `## Feature 1: [Name]` block with the new story.
- Otherwise, **append** a new section using the same format already in the file (heading, As a / I want to / So that, acceptance criteria checklist).

After writing, tell the user:
> "✅ Story drafted at docs/product/user-stories.md. Please review it before we continue — does it look right, or do you want any changes?"

**Wait for explicit confirmation before proceeding.** If the user requests changes, apply them and ask again.

If the user said to skip (infrastructure work), note that no story will be checked during `/validate` and continue.

## Step 7: Load remaining context
Read:
- @docs/product/user-stories.md — find the story (or stories) for this feature; the acceptance criteria here are what `/validate` will check against
- @docs/architecture/overview.md
- @docs/architecture/database.md (if data changes needed)
- @docs/architecture/api-contracts.md (if API changes needed)
- @docs/architecture/security.md (always skim for relevant constraints)
- @docs/product/design-system.md (skim if it exists and the feature has UI)

## Step 8: Create a mini-plan
Present a short plan to the user:
- What files you expect to create or modify
- What tests you'll write
- Any architecture or product questions that need answering first

Wait for user approval before writing any code.

## Step 9: Remind
Tell the user: "When we're ready to wrap up, use `/validate` to run checks, then `/commit-feature` to finish."
