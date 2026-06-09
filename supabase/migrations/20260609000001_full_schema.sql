-- Migration: remaining 11 tables (F-003)
-- entities and profiles were created in 20260601000001_entities_profiles.sql

-- ── cost_centres ──────────────────────────────────────────────────────────────

CREATE TABLE public.cost_centres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  budget_owner_id UUID REFERENCES profiles(id),
  parent_id       UUID REFERENCES cost_centres(id),
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_id, code)
);

ALTER TABLE public.cost_centres ENABLE ROW LEVEL SECURITY;

-- ── budgets ───────────────────────────────────────────────────────────────────

CREATE TABLE public.budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_centre_id UUID NOT NULL REFERENCES cost_centres(id),
  category       TEXT NOT NULL,
  period_year    INT NOT NULL,
  period_month   INT,               -- NULL = annual; 1–12 = monthly
  amount         NUMERIC(14,2) NOT NULL,
  committed      NUMERIC(14,2) DEFAULT 0,   -- sum of pending/approved PRs
  actuals        NUMERIC(14,2) DEFAULT 0,   -- sum of invoiced POs
  currency       CHAR(3) DEFAULT 'ZAR',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cost_centre_id, category, period_year, period_month)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- ── vendors ───────────────────────────────────────────────────────────────────

CREATE TABLE public.vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  contact_name  TEXT,
  contact_email TEXT,
  preferred     BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- ── approval_matrices ─────────────────────────────────────────────────────────

CREATE TABLE public.approval_matrices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID NOT NULL REFERENCES entities(id),
  category       TEXT NOT NULL,
  level          INT NOT NULL CHECK (level BETWEEN 1 AND 6),
  min_amount     NUMERIC(14,2) DEFAULT 0,
  max_amount     NUMERIC(14,2),              -- NULL = no upper limit
  approver_role  TEXT NOT NULL,
  require_all    BOOLEAN DEFAULT FALSE,       -- AND logic: all users at this role must approve
  escalate_hours INT DEFAULT 48,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_id, category, level)
);

ALTER TABLE public.approval_matrices ENABLE ROW LEVEL SECURITY;

-- ── spend_requests ────────────────────────────────────────────────────────────

CREATE TABLE public.spend_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID NOT NULL REFERENCES entities(id),
  type           TEXT NOT NULL CHECK (type IN ('purchase_request','expense_claim')),
  reference_no   TEXT NOT NULL UNIQUE,       -- PR-2026-00042 or EXP-2026-00001
  requester_id   UUID NOT NULL REFERENCES profiles(id),
  cost_centre_id UUID NOT NULL REFERENCES cost_centres(id),
  project_code   TEXT,
  vendor_id      UUID REFERENCES vendors(id),
  vendor_name    TEXT,                       -- free-text if vendor not in catalogue
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  amount         NUMERIC(14,2) NOT NULL,
  currency       CHAR(3) DEFAULT 'ZAR',
  status         TEXT DEFAULT 'draft' CHECK (status IN (
                   'draft','submitted','pending_l1','pending_l2','pending_l3',
                   'pending_info','approved','rejected','cancelled','converted'
                 )),
  current_level  INT DEFAULT 1,
  priority       TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  required_by    DATE,
  justification  TEXT,
  budget_flag    BOOLEAN DEFAULT FALSE,      -- true if request exceeds available budget
  duplicate_flag BOOLEAN DEFAULT FALSE,      -- true if similar request submitted in last 30 days
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  submitted_at   TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  deleted_at     TIMESTAMPTZ                -- soft delete
);

ALTER TABLE public.spend_requests ENABLE ROW LEVEL SECURITY;

-- ── spend_request_attachments ─────────────────────────────────────────────────

CREATE TABLE public.spend_request_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES spend_requests(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,             -- Supabase Storage bucket path
  file_type       TEXT,
  file_size_bytes INT,
  uploaded_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.spend_request_attachments ENABLE ROW LEVEL SECURITY;

-- ── approval_events ───────────────────────────────────────────────────────────
-- Immutable audit log. Insert-only via service role.

CREATE TABLE public.approval_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES spend_requests(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES profiles(id),
  level           INT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN (
                    'submitted','approved','rejected','delegated',
                    'info_requested','info_provided','escalated','cancelled'
                  )),
  comment         TEXT,
  previous_status TEXT,
  new_status      TEXT,
  metadata        JSONB,                     -- e.g. { "delegated_by": "uuid", "token_used": true }
  created_at      TIMESTAMPTZ DEFAULT now()
  -- No updated_at: this table is insert-only
);

ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

-- ── purchase_orders ───────────────────────────────────────────────────────────

CREATE TABLE public.purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id              UUID NOT NULL REFERENCES entities(id),
  reference_no           TEXT NOT NULL UNIQUE,  -- PO-2026-00456
  request_id             UUID NOT NULL REFERENCES spend_requests(id),
  vendor_id              UUID REFERENCES vendors(id),
  vendor_name            TEXT,
  procurement_officer_id UUID REFERENCES profiles(id),
  status                 TEXT DEFAULT 'draft' CHECK (status IN (
                           'draft','issued','acknowledged','received',
                           'invoiced','closed','cancelled'
                         )),
  amount                 NUMERIC(14,2) NOT NULL,
  currency               CHAR(3) DEFAULT 'ZAR',
  notes                  TEXT,
  issued_at              TIMESTAMPTZ,
  expected_delivery      DATE,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- ── delegations ───────────────────────────────────────────────────────────────

CREATE TABLE public.delegations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES profiles(id),
  delegate_id  UUID NOT NULL REFERENCES profiles(id),
  valid_from   TIMESTAMPTZ NOT NULL,
  valid_until  TIMESTAMPTZ NOT NULL,
  reason       TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT now()
  -- No updated_at: delegations are created and cancelled (active=false), not edited
);

ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- ── notifications ─────────────────────────────────────────────────────────────

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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── webhook_logs ──────────────────────────────────────────────────────────────

CREATE TABLE public.webhook_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,           -- 'snowflake_approval_event' | 'snowflake_budget_sync'
  payload      JSONB NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','abandoned')),
  attempts     INT DEFAULT 0,
  last_error   TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
