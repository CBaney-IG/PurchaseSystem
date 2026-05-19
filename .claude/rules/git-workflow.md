---
description: Git workflow rules. Always follow these when working with git.
globs: ["**/*"]
---

# Git Workflow Rules

1. NEVER commit directly to main. Always work on a feature or hotfix branch.
2. Branch naming: `feature/[name]` for features, `hotfix/[name]` for urgent fixes.
3. Commit messages use conventional commits: `feat(scope):`, `fix(scope):`, `docs(scope):`, `refactor(scope):`, `test(scope):`.
4. Before committing, always run: lint, type-check, and tests.
5. NEVER force push. If you need to fix a commit, use `git commit --amend` only on unpushed commits.
6. Keep commits focused — one logical change per commit.
7. When in doubt, ask the user before any git operation that modifies history.
