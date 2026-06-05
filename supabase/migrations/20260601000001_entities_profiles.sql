-- Migration: entities + profiles
-- Creates the two tables needed for authentication to work.
-- Remaining 11 tables are created in F-003 migrations.

-- ── entities ─────────────────────────────────────────────────────────────────

CREATE TABLE public.entities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  parent_id  UUID REFERENCES entities(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id      UUID NOT NULL REFERENCES entities(id),
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'requester' CHECK (role IN (
                   'requester', 'approver_l1', 'approver_l2', 'approver_l3',
                   'procurement_officer', 'finance', 'admin', 'group_admin'
                 )),
  department     TEXT,
  manager_id     UUID REFERENCES profiles(id),
  approver_limit NUMERIC(12, 2) DEFAULT 0,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── RLS helper functions ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_entity_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT entity_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── RLS policies ─────────────────────────────────────────────────────────────

-- entities: users read their own entity; group_admin reads all
CREATE POLICY "entities_read" ON entities FOR SELECT
USING (
  id = get_my_entity_id()
  OR get_my_role() = 'group_admin'
);

CREATE POLICY "entities_write_group_admin" ON entities FOR ALL
USING (get_my_role() = 'group_admin');

-- profiles: users read/update own; admin reads entity scope; group_admin reads all
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
USING (
  id = auth.uid()
  OR get_my_role() IN ('admin', 'group_admin')
  OR (entity_id = get_my_entity_id() AND get_my_role() IN (
      'approver_l1', 'approver_l2', 'approver_l3',
      'procurement_officer', 'finance'
    ))
);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
USING (
  (get_my_role() = 'admin' AND entity_id = get_my_entity_id())
  OR get_my_role() = 'group_admin'
);

-- ── Triggers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on first sign-in
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, entity_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    (SELECT id FROM entities WHERE code = 'DEFAULT' LIMIT 1),
    'requester'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
