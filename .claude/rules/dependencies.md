---
description: Dependency management rules. Apply when adding, updating, or removing npm packages.
globs: ["package.json", "package-lock.json"]
---

# Dependency Rules

1. Before adding a new package, check if an existing dependency already covers the need.
2. Prefer well-maintained packages: last commit within 6 months, TypeScript types included, reasonable download count.
3. Check bundle size impact at bundlephobia.com before adding client-side dependencies.
4. When suggesting a new dependency, tell the user: what it does, why it's needed, its bundle size, and any alternatives considered.
5. Pin major versions in package.json (e.g., `"zod": "^3.0.0"` not `"zod": "*"`).
6. Never add a dependency just for a single utility function — write it or check if lodash/es (already tree-shakeable) covers it.
7. Document significant new dependencies in @docs/architecture/tech-stack.md.
