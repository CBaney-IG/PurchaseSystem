# Database Schema

> **Status:** Draft — populated during `/init-architecture`.
> This document is the source of truth for the data model. Update it BEFORE writing migrations.

## Design Principles

- All tables use `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- All tables have `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()`
- Use Row Level Security (RLS) policies for authorization
- Migrations are plain SQL — portable to any PostgreSQL instance
- Foreign keys use `ON DELETE CASCADE` unless there's a reason not to (document why)

## Tables

### users (managed by Supabase Auth)
Supabase Auth handles the `auth.users` table. We extend it with a `public.profiles` table:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (FK → auth.users) | Primary key, matches auth user |
| display_name | TEXT | User's display name |
| role | TEXT | User role (e.g., 'user', 'admin') |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**RLS Policies:**
- Users can read their own profile
- Users can update their own profile
- Admins can read all profiles

---

> Add more tables here as the data model is designed. Each table needs:
> - Column definitions with types and descriptions
> - RLS policies
> - Indexes (if needed for performance)
> - Relationships to other tables

## Entity Relationship Summary

```
[profiles] 1──── ... ────* [other_table]
```

## Migration History

| Migration | Description | Date |
|-----------|-------------|------|
| 001_initial_schema.sql | Create profiles table | TBD |

## Swapping Supabase for Raw PostgreSQL

If migrating away from Supabase:
1. Migrations in `supabase/migrations/` are standard SQL — run them on any PostgreSQL
2. Replace Supabase client in `src/lib/data/` with a PostgreSQL client (e.g., `pg`, Prisma, Drizzle)
3. Replace Supabase Auth with your chosen auth provider
4. RLS policies work on any PostgreSQL — keep them or replace with application-level auth middleware
