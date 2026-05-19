---
description: Start an urgent hotfix for a production issue. Creates a hotfix branch and fast-tracks validation.
argument-hint: [brief-description-of-issue]
---

# Hotfix Workflow

"🚨 Starting hotfix process. This is for urgent production issues only."

## Step 1: Branch from main
```bash
git checkout main
git pull origin main
git checkout -b hotfix/$ARGUMENTS
```

## Step 2: Understand the issue
Ask the user: "Describe the production issue. What's broken, and what's the user impact?"

## Step 3: Fix
Implement the minimal fix. Do not refactor, do not add features. Fix only the issue.
Explain: "I'm making the smallest possible change to fix this. We can improve the code in a proper feature branch later."

## Step 4: Fast-track validation
Run:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run test`
4. `npm run build`

Skip product/architecture review — this is a targeted fix.

## Step 5: Commit and guide merge
Commit with: `fix(scope): description of hotfix`

**Do NOT include `Co-Authored-By: Claude ...` or any AI-attribution trailer** in the commit message (per CLAUDE.md workflow rule #7).

Tell the user:
"✅ Hotfix committed. To deploy:
1. `git push origin hotfix/$ARGUMENTS`
2. Create PR to main and merge
3. Vercel will auto-deploy to production

After merging, consider: does this fix need a proper backlog item for a better long-term solution?"
