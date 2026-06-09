-- Migration: RLS policies for all F-003 tables
-- entities and profiles policies are in 20260601000001_entities_profiles.sql

-- ── cost_centres ──────────────────────────────────────────────────────────────

CREATE POLICY "cost_centres_read" ON cost_centres FOR SELECT
USING (entity_id = get_my_entity_id() OR get_my_role() = 'group_admin');

CREATE POLICY "cost_centres_write" ON cost_centres FOR ALL
USING (
  (entity_id = get_my_entity_id() AND get_my_role() IN ('admin', 'finance'))
  OR get_my_role() = 'group_admin'
);

-- ── budgets ───────────────────────────────────────────────────────────────────
-- All entity roles can read (needed for inline budget display on PR form).
-- Writes restricted to finance, admin, group_admin.

CREATE POLICY "budgets_read" ON budgets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cost_centres cc
    WHERE cc.id = cost_centre_id
    AND (cc.entity_id = get_my_entity_id() OR get_my_role() = 'group_admin')
  )
);

CREATE POLICY "budgets_write" ON budgets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cost_centres cc
    WHERE cc.id = cost_centre_id
    AND (
      (cc.entity_id = get_my_entity_id() AND get_my_role() IN ('finance','admin'))
      OR get_my_role() = 'group_admin'
    )
  )
);

CREATE POLICY "budgets_update_delete" ON budgets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM cost_centres cc
    WHERE cc.id = cost_centre_id
    AND (
      (cc.entity_id = get_my_entity_id() AND get_my_role() IN ('finance','admin'))
      OR get_my_role() = 'group_admin'
    )
  )
);

-- ── vendors ───────────────────────────────────────────────────────────────────
-- All entity roles can read active vendors (for PR form dropdown).

CREATE POLICY "vendors_read" ON vendors FOR SELECT
USING (entity_id = get_my_entity_id() OR get_my_role() = 'group_admin');

CREATE POLICY "vendors_write" ON vendors FOR ALL
USING (
  (entity_id = get_my_entity_id() AND get_my_role() IN ('procurement_officer','admin'))
  OR get_my_role() = 'group_admin'
);

-- ── approval_matrices ─────────────────────────────────────────────────────────
-- All roles can read (needed to preview approval path before submission).

CREATE POLICY "approval_matrices_read" ON approval_matrices FOR SELECT
USING (entity_id = get_my_entity_id() OR get_my_role() = 'group_admin');

CREATE POLICY "approval_matrices_write" ON approval_matrices FOR ALL
USING (
  (entity_id = get_my_entity_id() AND get_my_role() IN ('admin','procurement_officer'))
  OR get_my_role() = 'group_admin'
);

-- ── spend_requests ────────────────────────────────────────────────────────────
-- SELECT: requester sees own; approvers and privileged roles see entity scope.
-- INSERT: requesters create drafts via their session.
-- UPDATE: requesters can only edit their own drafts; all status transitions
--         go through processApproval() using the service role (bypasses RLS).

CREATE POLICY "spend_requests_select" ON spend_requests FOR SELECT
USING (
  requester_id = auth.uid()
  OR (
    entity_id = get_my_entity_id()
    AND get_my_role() IN (
      'approver_l1','approver_l2','approver_l3',
      'procurement_officer','finance','admin'
    )
  )
  OR get_my_role() = 'group_admin'
);

CREATE POLICY "spend_requests_insert" ON spend_requests FOR INSERT
WITH CHECK (
  requester_id = auth.uid()
  AND entity_id = get_my_entity_id()
);

CREATE POLICY "spend_requests_update_draft" ON spend_requests FOR UPDATE
USING (
  requester_id = auth.uid()
  AND status = 'draft'
);

-- ── spend_request_attachments ─────────────────────────────────────────────────
-- Visibility mirrors the parent spend_request.
-- No deletes permitted after submission (no DELETE policy).

CREATE POLICY "attachments_select" ON spend_request_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM spend_requests sr
    WHERE sr.id = request_id
    AND (
      sr.requester_id = auth.uid()
      OR (
        sr.entity_id = get_my_entity_id()
        AND get_my_role() IN (
          'approver_l1','approver_l2','approver_l3',
          'procurement_officer','finance','admin'
        )
      )
      OR get_my_role() = 'group_admin'
    )
  )
);

CREATE POLICY "attachments_insert" ON spend_request_attachments FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM spend_requests sr
    WHERE sr.id = request_id
    AND sr.requester_id = auth.uid()
  )
);

-- ── approval_events ───────────────────────────────────────────────────────────
-- SELECT: requester of linked request + entity approvers and admin roles.
-- No INSERT/UPDATE/DELETE policies — service role only; all client writes blocked.

CREATE POLICY "approval_events_select" ON approval_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM spend_requests sr
    WHERE sr.id = request_id
    AND (
      sr.requester_id = auth.uid()
      OR (
        sr.entity_id = get_my_entity_id()
        AND get_my_role() IN (
          'approver_l1','approver_l2','approver_l3',
          'procurement_officer','finance','admin'
        )
      )
      OR get_my_role() = 'group_admin'
    )
  )
);

-- ── purchase_orders ───────────────────────────────────────────────────────────
-- Requesters can read POs linked to their approved PRs.

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
USING (
  (
    entity_id = get_my_entity_id()
    AND get_my_role() IN ('procurement_officer','finance','admin')
  )
  OR get_my_role() = 'group_admin'
  OR EXISTS (
    SELECT 1 FROM spend_requests sr
    WHERE sr.id = request_id AND sr.requester_id = auth.uid()
  )
);

CREATE POLICY "purchase_orders_write" ON purchase_orders FOR ALL
USING (
  (entity_id = get_my_entity_id() AND get_my_role() IN ('procurement_officer','admin'))
  OR get_my_role() = 'group_admin'
);

-- ── delegations ───────────────────────────────────────────────────────────────

CREATE POLICY "delegations_select" ON delegations FOR SELECT
USING (
  delegator_id = auth.uid()
  OR delegate_id = auth.uid()
  OR (
    get_my_role() IN ('admin','group_admin')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = delegator_id
      AND (p.entity_id = get_my_entity_id() OR get_my_role() = 'group_admin')
    )
  )
);

CREATE POLICY "delegations_insert" ON delegations FOR INSERT
WITH CHECK (delegator_id = auth.uid());

CREATE POLICY "delegations_update" ON delegations FOR UPDATE
USING (delegator_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────────────────────
-- Users read and update (mark read) only their own.
-- INSERT: service role only (no client INSERT policy).

CREATE POLICY "notifications_select" ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_read" ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- ── webhook_logs ──────────────────────────────────────────────────────────────
-- Admin/group_admin read for diagnostics. Service role writes.

CREATE POLICY "webhook_logs_read" ON webhook_logs FOR SELECT
USING (get_my_role() IN ('admin','group_admin'));
