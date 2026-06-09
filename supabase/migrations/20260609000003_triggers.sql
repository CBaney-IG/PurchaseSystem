-- Migration: updated_at triggers for F-003 tables
-- update_updated_at() function was created in 20260601000001_entities_profiles.sql

CREATE TRIGGER trg_cost_centres_updated_at
  BEFORE UPDATE ON cost_centres
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_approval_matrices_updated_at
  BEFORE UPDATE ON approval_matrices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_spend_requests_updated_at
  BEFORE UPDATE ON spend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
