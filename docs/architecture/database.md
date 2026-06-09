# Database Schema

> **Status:** Active — confirmed during `/init-architecture` (June 2026)
> This document is the source of truth for the data model. Update it BEFORE writing migrations.
> Full SQL sourced from FRS-USMP-001 §2.

## Design Principles

- All tables in the `public` schema. RLS enabled on every table.
- Primary keys: `UUID DEFAULT gen_random_uuid()`
- All timestamps: `TIMESTAMPTZ` (UTC). `created_at` and `updated_at` on all tables.
- Soft deletes via `deleted_at TIMESTAMPTZ` on `spend_requests` only — all other deletes are hard or prevented by RLS.
- Foreign keys use `ON DELETE CASCADE` for child records (attachments, events). Profiles use `ON DELETE CASCADE` from `auth.users`.
- Migrations are plain SQL in `supabase/migrations/` — portable to any PostgreSQL 15+ instance.
- Never edit a migration that has been applied to production — create a new one instead.

## Migration File Order

```
supabase/migrations/
  20260601000001_entities_profiles.sql   # entities, profiles, helper functions, handle_new_user trigger (F-001)
  20260609000001_full_schema.sql         # Remaining 11 tables (F-003)
  20260609000002_rls_policies.sql        # All RLS policies (F-003)
  20260609000003_triggers.sql            # updated_at triggers for F-003 tables (F-003)
  20260609000004_indexes.sql             # Performance indexes (F-003)
  20260609000005_seed_categories.sql     # DEFAULT entity + DOA matrix seed data (F-003)
```

---

## Tables

### `entities`
One row per BPO Group legal entity / business unit. Top of the hierarchy.

```sql
CREATE TABLE public.entities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,  -- e.g. 'BPO-OPS'
  parent_id  UUID REFERENCES entities(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** `group_admin` can read/write all. All other roles can read their own entity only (via `get_my_entity_id()`).

---

### `profiles`
Extends `auth.users`. Created automatically via `handle_new_user` trigger on first SSO login.

```sql
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id      UUID NOT NULL REFERENCES entities(id),
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN (
                   'requester','approver_l1','approver_l2','approver_l3',
                   'procurement_officer','finance','admin','group_admin')),
  department     TEXT,
  manager_id     UUID REFERENCES profiles(id),
  approver_limit NUMERIC(12,2) DEFAULT 0,  -- max amount this user can approve
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

**RLS:**
- Users can read and update their own profile.
- `admin` and `group_admin` can read all profiles in their scope.
- `group_admin` can update role, entity_id, active for any user.
- `admin` can update role and active for users within their entity.

---

### `cost_centres`
Per-entity cost centres. Budget is tracked at this level.

```sql
CREATE TABLE public.cost_centres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  budget_owner_id UUID REFERENCES profiles(id),
  parent_id       UUID REFERENCES cost_centres(id),
  active          BOOLEAN DEFAULT TRUE,
  UNIQUE(entity_id, code)
);
```

**RLS:** Entity isolation policy — users see only cost centres in their entity. `group_admin` sees all.

---

### `budgets`
Annual (and optionally monthly) budget amounts per cost centre and spend category.

```sql
CREATE TABLE public.budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_centre_id  UUID NOT NULL REFERENCES cost_centres(id),
  category        TEXT NOT NULL,
  period_year     INT NOT NULL,
  period_month    INT,              -- NULL = annual budget, 1–12 = monthly
  amount          NUMERIC(14,2) NOT NULL,
  committed       NUMERIC(14,2) DEFAULT 0,  -- sum of pending/approved PRs
  actuals         NUMERIC(14,2) DEFAULT 0,  -- sum of invoiced POs
  currency        CHAR(3) DEFAULT 'ZAR',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cost_centre_id, category, period_year, period_month)
);
```

**RLS:** `finance`, `admin`, `group_admin` can write. All roles in the entity can read (needed for inline budget display on PR form).

---

### `vendors`
Approved vendor catalogue. Per-entity.

```sql
CREATE TABLE public.vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  contact_name  TEXT,
  contact_email TEXT,
  preferred     BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** Entity isolation. `procurement_officer`, `admin`, `group_admin` can write. All roles can read active vendors (for PR form dropdown).

---

### `approval_matrices`
DOA configuration per entity, spend category, and approval level. Editable at runtime by admin.

```sql
CREATE TABLE public.approval_matrices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID NOT NULL REFERENCES entities(id),
  category       TEXT NOT NULL,
  level          INT NOT NULL CHECK (level BETWEEN 1 AND 6),
  min_amount     NUMERIC(14,2) DEFAULT 0,
  max_amount     NUMERIC(14,2),     -- NULL = no upper limit (catches everything above)
  approver_role  TEXT NOT NULL,     -- role required at this level
  require_all    BOOLEAN DEFAULT FALSE,  -- AND logic: all approvers at this role must approve
  escalate_hours INT DEFAULT 48,    -- hours before auto-escalation reminder fires
  active         BOOLEAN DEFAULT TRUE,
  UNIQUE(entity_id, category, level)
);
```

**RLS:** `admin`, `group_admin` can read/write. All roles can read (needed to preview approval path). Changes audited via `approval_events`.

---

### `spend_requests`
Unified table for Purchase Requisitions and Expense Claims. The `type` column distinguishes them.

```sql
CREATE TABLE public.spend_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  type            TEXT NOT NULL CHECK (type IN ('purchase_request','expense_claim')),
  reference_no    TEXT NOT NULL UNIQUE,  -- PR-2026-00042 or EXP-2026-00001
  requester_id    UUID NOT NULL REFERENCES profiles(id),
  cost_centre_id  UUID NOT NULL REFERENCES cost_centres(id),
  project_code    TEXT,
  vendor_id       UUID REFERENCES vendors(id),
  vendor_name     TEXT,              -- free-text if vendor not in catalogue
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(14,2) NOT NULL,
  currency        CHAR(3) DEFAULT 'ZAR',
  status          TEXT DEFAULT 'draft' CHECK (status IN (
                    'draft','submitted','pending_l1','pending_l2','pending_l3',
                    'pending_info','approved','rejected','cancelled','converted')),
  current_level   INT DEFAULT 1,
  priority        TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  required_by     DATE,
  justification   TEXT,
  budget_flag     BOOLEAN DEFAULT FALSE,  -- true if request exceeds available budget
  duplicate_flag  BOOLEAN DEFAULT FALSE,  -- true if similar request in last 30 days
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ           -- soft delete
);
```

**RLS:**
- SELECT: requester sees own; approvers see entity-scoped requests at their level; `procurement_officer`, `finance`, `admin` see all in entity; `group_admin` sees all.
- INSERT: requester only, scoped to their `entity_id`.
- UPDATE: requester on own drafts; `admin`/`group_admin`/`procurement_officer` for status changes via service role only.

**Note on approval status transitions via service role:** All status mutations (submit, approve, reject, escalate) are performed by `processApproval()` using the service role client, not the anon/user client. This ensures RLS UPDATE policy does not need to be overly permissive.

---

### `spend_request_attachments`
Files uploaded with a PR or expense claim. Stored in Supabase Storage.

```sql
CREATE TABLE public.spend_request_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES spend_requests(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,   -- Supabase Storage bucket path
  file_type       TEXT,
  file_size_bytes INT,
  uploaded_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** Same visibility as parent `spend_request`. No deletes permitted after submission.

---

### `approval_events`
Immutable audit log of every action taken on every document. Insert-only via service role.

```sql
CREATE TABLE public.approval_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES spend_requests(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES profiles(id),
  level           INT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN (
                    'submitted','approved','rejected','delegated',
                    'info_requested','info_provided','escalated','cancelled')),
  comment         TEXT,
  previous_status TEXT,
  new_status      TEXT,
  metadata        JSONB,   -- e.g. { "delegated_by": "uuid", "token_used": true }
  created_at      TIMESTAMPTZ DEFAULT now()
  -- No updated_at — this table is insert-only
);
```

**RLS:**
- SELECT: requester of the linked request + anyone with entity-scoped approver/admin role.
- INSERT: service role only (no client-side insert policy). Enforced via API routes.
- UPDATE / DELETE: no policy — blocked for all users including admins.

---

### `purchase_orders`
Auto-drafted from approved PRs. Managed by Procurement Officer.

```sql
CREATE TABLE public.purchase_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id             UUID NOT NULL REFERENCES entities(id),
  reference_no          TEXT NOT NULL UNIQUE,  -- PO-2026-00456
  request_id            UUID NOT NULL REFERENCES spend_requests(id),
  vendor_id             UUID REFERENCES vendors(id),
  vendor_name           TEXT,
  procurement_officer_id UUID REFERENCES profiles(id),
  status                TEXT DEFAULT 'draft' CHECK (status IN (
                          'draft','issued','acknowledged','received',
                          'invoiced','closed','cancelled')),
  amount                NUMERIC(14,2) NOT NULL,
  currency              CHAR(3) DEFAULT 'ZAR',
  notes                 TEXT,
  issued_at             TIMESTAMPTZ,
  expected_delivery     DATE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** `procurement_officer`, `finance`, `admin`, `group_admin` can read/write. Requesters can read POs linked to their approved PRs.

---

### `delegations`
Approval authority delegation with a date range.

```sql
CREATE TABLE public.delegations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES profiles(id),
  delegate_id  UUID NOT NULL REFERENCES profiles(id),
  valid_from   TIMESTAMPTZ NOT NULL,
  valid_until  TIMESTAMPTZ NOT NULL,
  reason       TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

**Constraint (enforced in application layer):** No overlapping active delegations for the same delegator. Checked in Server Action before insert.

**RLS:** Delegator can read/write their own delegations. Delegate can read delegations that name them. `admin` can read all in entity.

---

### `notifications`
In-app notification queue. Also tracks whether an email was sent.

```sql
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  request_id UUID REFERENCES spend_requests(id),
  type       TEXT NOT NULL,  -- 'approval_needed','approved','rejected','info_requested', etc.
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** Users read and update (mark read) only their own notifications. Service role inserts.

---

### `webhook_logs`
Tracks Snowflake push attempts and retry state.

```sql
CREATE TABLE public.webhook_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,           -- 'snowflake_approval_event' | 'snowflake_budget_sync'
  payload      JSONB NOT NULL,
  status       TEXT DEFAULT 'pending'   -- pending | sent | failed | abandoned
               CHECK (status IN ('pending','sent','failed','abandoned')),
  attempts     INT DEFAULT 0,
  last_error   TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** `admin`, `group_admin` can read for support diagnostics. Service role writes.

---

## RLS Helper Functions

These must be created before the RLS policies that reference them.

```sql
-- Returns the entity_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_entity_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT entity_id FROM profiles WHERE id = auth.uid();
$$;

-- Returns the role for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;
```

## Entity Isolation Policy Pattern

Applied to every table that has an `entity_id` column:

```sql
CREATE POLICY "entity_isolation" ON <table_name> FOR ALL
USING (
  entity_id = get_my_entity_id()
  OR get_my_role() = 'group_admin'
);
```

## Required Triggers

```sql
-- Auto-update updated_at on write
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Apply to: spend_requests, budgets, purchase_orders, profiles, vendors
CREATE TRIGGER trg_spend_requests_updated_at
  BEFORE UPDATE ON spend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- (repeat for each table)

-- Auto-create profile on first SSO login
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, entity_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    (SELECT id FROM entities WHERE code = 'DEFAULT' LIMIT 1),
    'requester'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Performance Indexes

```sql
-- Critical for RLS policy evaluation speed
CREATE INDEX idx_profiles_entity_id       ON profiles(entity_id);
CREATE INDEX idx_spend_requests_entity_id ON spend_requests(entity_id);
CREATE INDEX idx_spend_requests_requester ON spend_requests(requester_id);
CREATE INDEX idx_spend_requests_status    ON spend_requests(status);
CREATE INDEX idx_approval_events_request  ON approval_events(request_id);
CREATE INDEX idx_approval_events_approver ON approval_events(approver_id);
CREATE INDEX idx_budgets_cost_centre      ON budgets(cost_centre_id, period_year);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;
CREATE INDEX idx_vendors_entity_preferred ON vendors(entity_id, preferred) WHERE status = 'active';
CREATE INDEX idx_delegations_active       ON delegations(delegator_id, active) WHERE active = TRUE;
```

## Entity Relationship Summary

```
entities 1──────────────────────────────────* profiles
entities 1──────────────────────────────────* cost_centres
entities 1──────────────────────────────────* vendors
entities 1──────────────────────────────────* approval_matrices
entities 1──────────────────────────────────* spend_requests
entities 1──────────────────────────────────* purchase_orders

profiles(manager_id) *──────────────────────1 profiles
profiles 1──────────────────────────────────* spend_requests (requester)
profiles 1──────────────────────────────────* approval_events (approver)
profiles 1──────────────────────────────────* delegations (delegator + delegate)
profiles 1──────────────────────────────────* notifications

cost_centres 1──────────────────────────────* budgets
cost_centres 1──────────────────────────────* spend_requests

spend_requests 1────────────────────────────* spend_request_attachments
spend_requests 1────────────────────────────* approval_events
spend_requests 1────────────────────────────1 purchase_orders
```

## Migration History

| Migration | Description | Date |
|---|---|---|
| 20260601000001_entities_profiles.sql | entities, profiles, helper functions, handle_new_user (F-001) | 2026-06-05 |
| 20260609000001_full_schema.sql | Remaining 11 tables (F-003) | 2026-06-09 |
| 20260609000002_rls_policies.sql | All RLS policies (F-003) | 2026-06-09 |
| 20260609000003_triggers.sql | updated_at triggers for F-003 tables (F-003) | 2026-06-09 |
| 20260609000004_indexes.sql | Performance indexes (F-003) | 2026-06-09 |
| 20260609000005_seed_categories.sql | DEFAULT entity + DOA matrix seed data (F-003) | 2026-06-09 |
