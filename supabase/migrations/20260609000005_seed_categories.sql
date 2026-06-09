-- Migration: DEFAULT entity + spend categories + DOA approval matrix seed
-- Thresholds sourced from BRS-USMP-001 §5.2
-- Admins can modify thresholds at runtime via Admin > Approval Matrix.
--
-- Logic: a level is required for a request if the amount EXCEEDS the previous
-- level's max_amount. The first level whose max_amount >= amount (or max_amount
-- IS NULL) is the final required approver. Example: R6,000 IT Hardware →
-- L1 max=5,000 (exceeded, escalates) → L2 max=25,000 (satisfied, final).

-- Ensure the DEFAULT entity exists.
-- ON CONFLICT: safe to re-run; will not overwrite existing data.
INSERT INTO public.entities (id, name, code)
VALUES ('00000000-0000-0000-0000-000000000001', 'BPO Group (Default)', 'DEFAULT')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_entity UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

  -- General Operational (BRS §5.2 reference thresholds)
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'General Operational', 1,     0,  2500, 'approver_l1', 48),
    (v_entity, 'General Operational', 2,  2500, 10000, 'approver_l2', 48),
    (v_entity, 'General Operational', 3, 10000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- IT Hardware & Software (higher thresholds — capital expenditure)
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'IT Hardware & Software', 1,     0,  5000, 'approver_l1', 48),
    (v_entity, 'IT Hardware & Software', 2,  5000, 25000, 'approver_l2', 48),
    (v_entity, 'IT Hardware & Software', 3, 25000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- Office Supplies & Stationery
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'Office Supplies & Stationery', 1,     0,  2500, 'approver_l1', 48),
    (v_entity, 'Office Supplies & Stationery', 2,  2500, 10000, 'approver_l2', 48),
    (v_entity, 'Office Supplies & Stationery', 3, 10000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- Professional Services (consultancy, legal, audit)
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'Professional Services', 1,     0,  5000, 'approver_l1', 48),
    (v_entity, 'Professional Services', 2,  5000, 25000, 'approver_l2', 48),
    (v_entity, 'Professional Services', 3, 25000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- Facilities & Maintenance
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'Facilities & Maintenance', 1,     0,  5000, 'approver_l1', 48),
    (v_entity, 'Facilities & Maintenance', 2,  5000, 25000, 'approver_l2', 48),
    (v_entity, 'Facilities & Maintenance', 3, 25000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- Travel & Accommodation
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'Travel & Accommodation', 1,     0,  2500, 'approver_l1', 48),
    (v_entity, 'Travel & Accommodation', 2,  2500, 10000, 'approver_l2', 48),
    (v_entity, 'Travel & Accommodation', 3, 10000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- Employee Expense (expense claims routing)
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'Employee Expense', 1,     0,  2500, 'approver_l1', 48),
    (v_entity, 'Employee Expense', 2,  2500, 10000, 'approver_l2', 48),
    (v_entity, 'Employee Expense', 3, 10000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

  -- Marketing & Events
  INSERT INTO public.approval_matrices
    (entity_id, category, level, min_amount, max_amount, approver_role, escalate_hours)
  VALUES
    (v_entity, 'Marketing & Events', 1,     0,  5000, 'approver_l1', 48),
    (v_entity, 'Marketing & Events', 2,  5000, 25000, 'approver_l2', 48),
    (v_entity, 'Marketing & Events', 3, 25000,  NULL, 'approver_l3', 48)
  ON CONFLICT (entity_id, category, level) DO NOTHING;

END $$;
