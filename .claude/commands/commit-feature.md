---
description: Finalize and commit current feature work. Updates docs, creates a clean commit, and prepares for merge.
---

# Commit Feature

Finalize the current feature. Follow each step and explain as you go.

## Step 1: Verify validation
"🔍 Checking if validation has passed..."
Ask: "Have you run `/validate` and are all checks passing? (y/n)"
If no, suggest running it first.

## Step 2: Update documentation
"📝 Updating project documentation..."

### Backlog
Read @docs/development/backlog.md. Mark the completed feature as ✅ Done with today's date.

### Architecture (if changed)
If database schema, API contracts, or component boundaries changed during this feature:
- Update the relevant docs in docs/architecture/
- Show the user what you're changing and get approval first

### Current phase
Read @docs/development/current-phase.md. Update progress if applicable.

### README (at phase boundaries only)
Check @docs/development/backlog.md — if this feature is the last item in the current phase:
- Review README.md and ask the user: "This completes the current phase. Should I update the README to reflect what's been built so far? (e.g., update the product description, add setup steps for new features, update the tech stack summary)"
- Only update README with user approval. Skip this check for mid-phase features.

## Step 3: Stage and review
Run `git add -A` then `git diff --cached --stat` to show what's staged.
Present the list of changed files to the user.
Ask: "Does this look right? Any files that shouldn't be included?"

## Step 4: Create commit
Write a clear conventional commit message:
- Format: `feat(scope): short description`
- Include a body listing key changes
- Reference the backlog item if applicable
- **Do NOT include `Co-Authored-By: Claude ...` or any AI-attribution trailer** (per CLAUDE.md workflow rule #7). Commit messages should look human-authored.

Show the proposed commit message. Wait for user approval.
Then run `git commit`.

## Step 5: Next steps
Tell the user:
"✅ Feature committed on branch `[branch-name]`.

**Next steps (you choose):**
A) Push and create a PR: `git push origin [branch-name]`
   → Vercel will auto-deploy a preview for QA testing
B) Continue working on another feature on this branch
C) Switch back to main: `git checkout main`

What would you like to do?"
