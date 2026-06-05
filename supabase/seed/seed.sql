-- Development seed data
-- Run via: supabase db reset (runs migrations first, then this file)
-- ⚠️  Never run against production.

-- ── Entities ─────────────────────────────────────────────────────────────────

INSERT INTO public.entities (id, name, code) VALUES
  ('00000000-0000-0000-0000-000000000001', 'BPO Group', 'DEFAULT'),
  ('00000000-0000-0000-0000-000000000002', 'BPO Operations', 'BPO-OPS');

-- ── Test users ────────────────────────────────────────────────────────────────
-- Create test accounts via Supabase Studio at http://localhost:54323
-- Authentication > Users > Add user
--
-- Suggested test accounts (password: Test1234! for all):
--
--   group.admin@bpogroup.local   → set role to 'group_admin'
--   admin@bpogroup.local         → set role to 'admin'
--   procurement@bpogroup.local   → set role to 'procurement_officer'
--   finance@bpogroup.local       → set role to 'finance'
--   approver.l1@bpogroup.local   → set role to 'approver_l1'
--   approver.l2@bpogroup.local   → set role to 'approver_l2'
--   approver.l3@bpogroup.local   → set role to 'approver_l3'
--   requester@bpogroup.local     → keep role as 'requester' (default)
--
-- After creating users in Studio, run this SQL in the Studio SQL editor
-- to set their roles (replace UUIDs with actual user IDs from auth.users):
--
--   UPDATE public.profiles SET role = 'group_admin'
--   WHERE email = 'group.admin@bpogroup.local';
--
--   UPDATE public.profiles SET role = 'admin'
--   WHERE email = 'admin@bpogroup.local';
--
-- (repeat for each role)
--
-- Or use the Supabase CLI (after supabase start):
--   supabase auth users create --email admin@bpogroup.local --password Test1234!
