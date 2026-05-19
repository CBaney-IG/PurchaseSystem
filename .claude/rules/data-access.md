---
description: Data access rules. Apply when working with database, Supabase, or API code.
globs: ["src/lib/data/**", "src/app/api/**", "supabase/migrations/**"]
---

# Data Access Rules

1. All Supabase client usage must be in `src/lib/data/`. Components and pages import functions from there, never the Supabase client directly.
2. Database migrations go in `supabase/migrations/` as plain SQL files. They must work on any standard PostgreSQL database.
3. Never use Supabase-specific features (Edge Functions, Realtime, Storage) without documenting the migration path in an ADR.
4. Always use parameterized queries — never interpolate user input into SQL strings.
5. Every new table or column must be documented in docs/architecture/database.md.
