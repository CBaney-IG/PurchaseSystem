---
description: Validate current work against product requirements, architecture, and code quality standards.
---

# Validate Current Work

Run all validation checks and report results. Explain each step briefly.

## Step 1: Code Quality
"🔍 Running code quality checks..."
Run these in order, report pass/fail for each:
1. `npm run lint` — code style
2. `npx tsc --noEmit` — TypeScript type checking
3. `npm run test` — unit tests
4. `npm run build` — build succeeds

If any fail, stop and show the errors. Ask: "Should I fix these before continuing?"

## Step 2: Product Validation
"📋 Checking against product requirements..."
Read @docs/product/user-stories.md to find the story (or stories) for the feature being worked on. The **acceptance criteria** for the work live there — not in the PRD or backlog. Also skim @docs/product/PRD.md for relevant out-of-scope items and @docs/development/backlog.md for the feature's dependencies.
Compare what was built against the acceptance criteria in the user story.
Report: which criteria are met ✅ and which are not yet met ❌.

## Step 3: Architecture Compliance
"🏗️ Checking architecture compliance..."
Read @docs/architecture/overview.md and verify:
- New code follows the documented component boundaries
- Database changes have migration files
- API changes match documented contracts
- No direct Supabase client usage outside of `src/lib/data/` (data access layer)

Report findings.

## Step 4: Security Quick Check
"🔒 Running security check..."
Read @docs/architecture/security.md and verify:
- No secrets or API keys in committed code
- Authentication/authorization on new endpoints
- Input validation on new forms or API inputs
- SQL injection prevention (parameterized queries)

Report findings.

## Step 5: Summary
Present a summary table:
| Check | Status |
|-------|--------|
| Lint | ✅/❌ |
| Types | ✅/❌ |
| Tests | ✅/❌ |
| Build | ✅/❌ |
| Product fit | ✅/❌ |
| Architecture | ✅/❌ |
| Security | ✅/❌ |

If all pass: "✅ All checks passed. Ready to commit with `/commit-feature`."
If any fail: "❌ Some checks need attention. Fix issues and run `/validate` again."
