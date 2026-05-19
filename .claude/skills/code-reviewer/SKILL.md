---
name: code-reviewer
description: Code review and quality checks. Use when reviewing changes before commit, checking code quality, looking for bugs, or when the user asks for a review. Also triggered by the validate command.
allowed-tools: Read, Grep, Glob, Bash
---

# Code Review Skill

Review code changes with focus on correctness, security, and maintainability.

## Review Checklist
1. **Correctness** — Does the code do what it's supposed to? Check against the backlog item's acceptance criteria.
2. **TypeScript** — Strict types, no `any` unless justified, proper error handling
3. **Security** — No secrets in code, input validation, auth checks, parameterized queries
4. **Tests** — New functionality has tests, edge cases covered
5. **Architecture compliance** — Code follows documented patterns in docs/architecture/overview.md
6. **Data access** — Supabase calls only in src/lib/data/, not in components or pages
7. **Naming** — Clear, consistent naming following project conventions
8. **No dead code** — Remove unused imports, commented-out code, console.logs

## How to Report
Be specific. Don't just say "this could be better." Say what's wrong and suggest a fix.

Format:
- 🐛 **Bug:** [description + suggested fix]
- 🔒 **Security:** [description + suggested fix]
- ⚠️ **Warning:** [description + suggested fix]
- 💡 **Suggestion:** [description] (non-blocking)

## Tone
Be helpful, not harsh. Remember the user may be new to development.
Explain WHY something is a problem, not just that it is.
