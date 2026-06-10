-- F-004: Add active column to entities (Story 2.4 — group_admin can deactivate entities)
-- Also add updated_at column and trigger (missed in F-003)

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Back-fill updated_at for existing rows
UPDATE public.entities SET updated_at = created_at WHERE updated_at IS NULL;

-- Apply updated_at trigger
CREATE TRIGGER trg_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
