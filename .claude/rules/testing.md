---
description: Testing rules. Apply when writing tests, adding features, or during validation.
globs: ["src/**", "tests/**", "**/*.test.*", "**/*.spec.*"]
---

# Testing Rules

1. Every new feature or component should have at least one test covering the happy path.
2. Bug fixes must include a test that would have caught the bug.
3. Colocate unit tests next to the file they test: `component.tsx` → `component.test.tsx`.
4. End-to-end tests go in `tests/e2e/` and test real user flows, not implementation details.
5. Test behaviour, not implementation — test what the user sees and does, not internal state.
6. Use descriptive test names: "should show error message when email is invalid" not "test1".
7. Don't mock what you don't own — prefer testing against real (or seeded) data where practical.
8. Aim for meaningful coverage, not a percentage target. Cover: happy paths, error states, edge cases, and access control.

See @docs/architecture/tech-stack.md for current testing frameworks and configuration.
