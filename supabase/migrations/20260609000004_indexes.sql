-- Migration: performance indexes
-- Critical for RLS policy evaluation speed and query performance at scale.

-- profiles
CREATE INDEX idx_profiles_entity_id  ON profiles(entity_id);
CREATE INDEX idx_profiles_role        ON profiles(role);

-- spend_requests
CREATE INDEX idx_spend_requests_entity_id ON spend_requests(entity_id);
CREATE INDEX idx_spend_requests_requester ON spend_requests(requester_id);
CREATE INDEX idx_spend_requests_status    ON spend_requests(status);
CREATE INDEX idx_spend_requests_type      ON spend_requests(type);

-- approval_events
CREATE INDEX idx_approval_events_request  ON approval_events(request_id);
CREATE INDEX idx_approval_events_approver ON approval_events(approver_id);

-- budgets
CREATE INDEX idx_budgets_cost_centre ON budgets(cost_centre_id, period_year);

-- notifications: partial index — only unread rows; keeps index small
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;

-- vendors: partial index — only active + preferred; used for PR form dropdown ordering
CREATE INDEX idx_vendors_entity_preferred ON vendors(entity_id, preferred) WHERE status = 'active';

-- delegations: partial index — only active delegations; used in approver resolution
CREATE INDEX idx_delegations_active   ON delegations(delegator_id, active) WHERE active = TRUE;
CREATE INDEX idx_delegations_delegate ON delegations(delegate_id, active)  WHERE active = TRUE;

-- approval_matrices
CREATE INDEX idx_approval_matrices_entity ON approval_matrices(entity_id, category, level);

-- purchase_orders
CREATE INDEX idx_purchase_orders_entity  ON purchase_orders(entity_id);
CREATE INDEX idx_purchase_orders_request ON purchase_orders(request_id);
