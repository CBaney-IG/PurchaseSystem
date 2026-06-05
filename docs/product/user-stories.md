# User Stories

> Detailed user stories for the USMP. Sourced from BRS-USMP-001, FRS-USMP-001, and AC-01 through AC-10.
> Format: As a [persona], I want to [action] so that [benefit].
> Stories are grouped by feature and ordered to match the build sequence in the Product Manual.

---

## Feature 1: Authentication & SSO (F-002)

### Story 1.1: Sign in via Azure AD
**As a** BPO Group staff member
**I want to** sign in to the platform using my existing Microsoft / Azure AD credentials
**So that** I don't need a separate username and password

**Acceptance criteria:**
- [ ] Clicking "Sign in" redirects to the Microsoft Entra ID login page
- [ ] After successful Azure AD authentication the user is redirected to the dashboard
- [ ] No separate registration or password creation is required
- [ ] Users who are not in the Azure AD tenant receive a clear error message
- [ ] Session expires after 8 hours of inactivity and redirects to login

**Notes:** Email/password auth must be disabled in Supabase Auth settings. Azure AD is the single source of truth for identity.

---

### Story 1.2: Automatic profile creation on first login
**As a** new staff member logging in for the first time
**I want to** have my profile automatically created
**So that** I can use the platform immediately without an admin setting me up manually

**Acceptance criteria:**
- [ ] A `profiles` record is created automatically via database trigger on first SSO login
- [ ] Default role is `requester` until an admin changes it
- [ ] Full name and email are populated from Azure AD metadata
- [ ] New user is assigned to the DEFAULT entity until an admin reassigns them
- [ ] User sees the dashboard immediately after first login, not an error

---

## Feature 2: User & Entity Management (F-003)

### Story 2.1: Invite and assign a user
**As an** admin
**I want to** invite a user by email, assign them to an entity, and set their role
**So that** they have the correct access from their first login

**Acceptance criteria:**
- [ ] Admin can navigate to Admin > Users > Invite User
- [ ] Form requires: email address, entity selection, role selection (dropdown of 8 roles)
- [ ] Submitted invitation triggers a Supabase Auth invite email to the user
- [ ] Invited user can log in via the email link and lands on the dashboard with correct role
- [ ] Invited user appears in the users list with status "Invited" until first login

---

### Story 2.2: Change a user's role
**As an** admin
**I want to** change a user's role without any code deployment
**So that** I can respond to organisational changes immediately

**Acceptance criteria:**
- [ ] Admin can find a user and edit their role from a dropdown
- [ ] Role change takes effect on the user's next page load (no re-invite required)
- [ ] Change is recorded in the audit log with the admin's identity and a timestamp

---

### Story 2.3: Deactivate a user
**As an** admin
**I want to** deactivate a user account
**So that** a departed staff member can no longer log in or approve requests

**Acceptance criteria:**
- [ ] Deactivated user cannot log in; receives a clear access-denied message
- [ ] Deactivated user does not appear as an available approver
- [ ] Their historical actions remain visible in all audit trails
- [ ] Admin is prompted to reassign any pending approvals that were assigned to this user

---

### Story 2.4: Manage business entities
**As a** group admin
**I want to** create and manage entity records (one per legal entity / business unit)
**So that** data isolation is enforced between Group companies

**Acceptance criteria:**
- [ ] Group admin can create, rename, and deactivate entities
- [ ] Each entity has: name, short code (e.g. BPO-OPS), optional parent entity
- [ ] Entity changes are audited
- [ ] Users in Entity A cannot see any data from Entity B (AC-09)

---

## Feature 3: Master Data — Vendors, Cost Centres, Budgets, DOA Matrix (F-004)

### Story 3.1: Manage the vendor catalogue
**As a** procurement officer
**I want to** maintain an approved vendor list with categories and preferred status
**So that** requesters only select from approved suppliers

**Acceptance criteria:**
- [ ] Procurement officer can add, edit, and deactivate vendors without developer involvement
- [ ] Each vendor has: name, category, contact name, contact email, preferred flag, status
- [ ] Preferred vendors appear at the top of the vendor dropdown in the PR form
- [ ] CSV bulk import is available for the initial vendor catalogue load
- [ ] Inactive vendors do not appear in PR form dropdowns

---

### Story 3.2: Import and manage the vendor catalogue via CSV
**As a** procurement officer
**I want to** bulk-import the initial vendor list from a CSV file
**So that** I don't have to enter hundreds of vendors manually

**Acceptance criteria:**
- [ ] Admin > Vendors screen has a "Import CSV" button
- [ ] Accepted columns: name, category, contact_name, contact_email, preferred (true/false)
- [ ] Validation errors are shown row-by-row before committing the import
- [ ] Successful import shows a count of records created

---

### Story 3.3: Manage cost centres and budget owners
**As an** admin or finance team member
**I want to** create and manage cost centres and assign budget owners
**So that** spend requests are correctly allocated and budget owners receive alerts

**Acceptance criteria:**
- [ ] Admin can create cost centres with: code, name, entity, budget owner (user dropdown), parent cost centre
- [ ] Cost centre codes must be unique within an entity
- [ ] Budget owner receives automated alerts when their cost centre exceeds 90% utilisation
- [ ] Cost centres that are inactive cannot be selected in the PR form

---

### Story 3.4: Upload annual budgets
**As a** finance team member
**I want to** upload or enter annual budgets per cost centre and spend category
**So that** the platform can enforce budget limits in real time

**Acceptance criteria:**
- [ ] Finance team can set a budget amount per cost centre, category, and year
- [ ] CSV upload is available for the bulk initial budget load
- [ ] Mid-year adjustments require a mandatory reason, which is logged
- [ ] Budget amounts are immediately reflected in the PR form's inline budget indicator

---

### Story 3.5: Configure the DOA approval matrix
**As an** admin or procurement officer
**I want to** configure the Delegation of Authority matrix — thresholds per category and level — without code changes
**So that** the approval routing reflects current governance policy

**Acceptance criteria:**
- [ ] Admin > Approval Matrix shows a grid: rows = spend categories, columns = levels L1–L6
- [ ] Each cell is editable inline: min amount, max amount, required approver role, AND/OR logic, escalation hours
- [ ] Changes take effect immediately for all new requests; in-progress requests use the matrix at time of submission
- [ ] All threshold changes are recorded in the audit log with previous value, new value, editor, and timestamp
- [ ] "Simulate Approval Path" tool: admin enters a category and amount and sees exactly who would approve (AC-02 adjacency)

**Notes:** Default DOA thresholds from BRS — e.g. General Operational: L1 R2,500, L2 R10,000, L3 R50,000. These must be pre-seeded as defaults.

---

## Feature 4: Purchase Requisition Submission (F-005)

### Story 4.1: Submit a new purchase request
**As an** operations staff member (requester)
**I want to** complete and submit a purchase request form
**So that** my request enters the formal approval process and I receive a reference number

**Acceptance criteria:**
- [ ] Form is accessible from dashboard via "New Purchase Request" button
- [ ] Required fields: title (max 120 chars), category, cost centre, estimated amount, description (min 20 chars)
- [ ] Justification is required and must be at least 50 characters for amounts above R5,000
- [ ] Optional fields: preferred vendor (searchable, preferred vendors first), project code, required-by date (cannot be past), priority toggle (Normal/Urgent), attachments
- [ ] Cost centre dropdown shows remaining budget inline after selection
- [ ] Estimated amount field shows real-time remaining budget for the selected cost centre + category
- [ ] A warning banner appears if the request would exceed the available budget (does not block submission)
- [ ] Submit button is disabled until all required fields are valid
- [ ] Before final submit, user sees an approval path preview listing the approvers in sequence
- [ ] On submission, requester sees a confirmation screen with the auto-generated reference number (PR-YYYY-NNNNN)
- [ ] A new requester can complete this flow in under 5 minutes unaided (AC-01)

---

### Story 4.2: Save a purchase request as a draft
**As a** requester
**I want to** save a PR as a draft and return to it later
**So that** I don't lose my work if I need to gather more information before submitting

**Acceptance criteria:**
- [ ] "Save Draft" button is available at any point on the PR form
- [ ] Draft PRs appear in the requester's "My Requests" list with status "Draft"
- [ ] Requester can reopen, edit, and submit a draft at any time
- [ ] Draft PRs do not notify any approvers

---

### Story 4.3: Attach supporting documents to a PR
**As a** requester
**I want to** attach quotes, invoices, or other documents to my PR
**So that** approvers have all the information they need to make a decision

**Acceptance criteria:**
- [ ] Multi-file upload supported; max 10 files, 10 MB each
- [ ] Accepted file types: PDF, PNG, JPG, DOCX, XLSX
- [ ] Files are stored in Supabase Storage and linked to the spend request
- [ ] Approvers can preview or download attachments from the request detail drawer
- [ ] Attachments cannot be deleted once the PR is submitted

---

### Story 4.4: View and track my submitted requests
**As a** requester
**I want to** see the current status of all my submitted requests
**So that** I know where each request is in the approval process without following up by email

**Acceptance criteria:**
- [ ] "My Requests" screen lists all PRs and expense claims submitted by the current user
- [ ] Each row shows: reference number, title, category, amount, current status, date submitted
- [ ] Status badges are colour-coded: green (approved), amber (pending), red (rejected)
- [ ] Clicking a request opens the full detail view including the approval history timeline
- [ ] Requester can cancel a request that is still in "Draft" or "Pending L1" status

---

### Story 4.5: Provide additional information when requested by an approver
**As a** requester
**I want to** respond to an approver's request for more information
**So that** my PR can continue through the approval process

**Acceptance criteria:**
- [ ] Requester receives an email and in-app notification when an approver requests more information
- [ ] PR status changes to "Pending Info" and the approver's question is visible
- [ ] Requester can submit a text response and optionally attach additional files
- [ ] On submitting the response, PR status returns to `pending_lX` (the level that requested info)
- [ ] The approver receives an in-app and email notification that the information has been provided

---

## Feature 5: Approval Engine (F-006)

### Story 5.1: Receive and act on an approval request (in-platform)
**As an** L1, L2, or L3 approver
**I want to** see all requests pending my action in one place
**So that** I can review and decide without hunting through email

**Acceptance criteria:**
- [ ] Approver inbox shows all requests at the approver's current level, sorted by urgency then age
- [ ] Each row shows: reference number, title, requester name, category, amount, cost centre, days waiting
- [ ] Clicking a row opens a right-panel drawer with: full request details, budget impact card (green/amber/red), attachment previews, complete approval history timeline
- [ ] Approve (green), Reject (red), and Request Info (blue) buttons are visible in the drawer
- [ ] Reject requires a mandatory comment
- [ ] All actions require a confirmation modal before executing

---

### Story 5.2: Approve a request via email without logging in (AC-03)
**As an** approver
**I want to** click an Approve or Reject button in my email and have the action recorded immediately
**So that** I can respond to requests while away from my desk without needing to log in

**Acceptance criteria:**
- [ ] Approval notification email contains one-click Approve and Reject buttons
- [ ] Clicking either button does not require the approver to be logged into the platform
- [ ] Each email button uses a signed HMAC-SHA256 JWT token containing: request ID, approver ID, action, 48-hour expiry
- [ ] Tokens are single-use; a second click on a used token shows a clear "already actioned" message
- [ ] Expired tokens (>48 hours) show a clear expiry message with a link to log in directly
- [ ] The action is recorded identically to an in-platform approval (approval_event created, routing continues)

---

### Story 5.3: Auto-escalation to next approval level
**As a** requester
**I want** my request to automatically route to the next approver when the current level approves it
**So that** I don't have to manually chase each level

**Acceptance criteria:**
- [ ] When L1 approves and the request amount exceeds the L1 threshold, status changes to `pending_l2` automatically
- [ ] L2 approvers receive an email and in-app notification immediately
- [ ] For an R6,000 IT Hardware request: routes to L1 (threshold R5,000), then auto-escalates to L2 on L1 approval (AC-02)
- [ ] When the final required level approves, status changes to `approved`
- [ ] Rejected at any level: status changes to `rejected` and routing stops; requester notified with reason

---

### Story 5.4: Bulk approve routine requests
**As an** L2 or L3 approver
**I want to** select multiple pending requests and approve them with a single comment
**So that** I can process routine low-risk requests efficiently

**Acceptance criteria:**
- [ ] Checkboxes appear on the approver inbox list for multi-select
- [ ] "Bulk Approve" button activates when one or more items are selected (max 20)
- [ ] Bulk approve prompts for a single optional comment applied to all selected approvals
- [ ] A confirmation modal shows the count and total value before executing
- [ ] Each approval is recorded as an individual approval_event

---

## Feature 6: Expense Claims (F-007)

### Story 6.1: Submit an expense claim with a receipt
**As an** employee
**I want to** photograph my receipt and submit an expense claim
**So that** I can get reimbursed without filling in a manual form or emailing Finance

**Acceptance criteria:**
- [ ] "New Expense Claim" button is accessible from the dashboard
- [ ] Receipt photo can be uploaded from device (file picker and mobile camera both supported)
- [ ] System attempts OCR extraction of vendor name, amount, and date (Phase 1: user confirms/corrects; extraction is best-effort)
- [ ] Employee selects category, cost centre, and optional project code
- [ ] On submission, expense claim routes through the DOA matrix for the expense category
- [ ] Reference number format: EXP-YYYY-NNNNN
- [ ] Receipt images are stored securely in Supabase Storage

**Notes:** Full automated OCR is Phase 2. Phase 1 still presents the upload flow and attempts basic extraction, but user must confirm all values.

---

## Feature 7: Purchase Order Generation (F-008)

### Story 7.1: Auto-generate a draft PO when a PR is approved
**As a** procurement officer
**I want** a draft Purchase Order to be created automatically when a PR reaches final approval
**So that** I can process the PO without manually re-entering the PR details

**Acceptance criteria:**
- [ ] Within 60 seconds of final approval, a draft PO record is created (AC-06)
- [ ] PO is pre-populated from the approved PR: vendor, amount, currency, cost centre, project code
- [ ] PO reference number format: PO-YYYY-NNNNN
- [ ] Procurement Officer receives an in-app and email notification that a new PO draft is ready
- [ ] PO status starts as "draft"

---

### Story 7.2: Manage purchase orders
**As a** procurement officer
**I want to** view, edit, and update the status of purchase orders
**So that** I can track the lifecycle from draft through to delivery and invoicing

**Acceptance criteria:**
- [ ] PO list screen shows all POs for the procurement officer's entity
- [ ] PO statuses: draft → issued → acknowledged → received → invoiced → closed / cancelled
- [ ] Procurement officer can update status, add notes, and set expected delivery date
- [ ] Each PO links back to the originating PR for full traceability

---

## Feature 8: Email Notifications (F-009)

### Story 8.1: Receive an approval-needed notification
**As an** approver
**I want to** receive an email whenever a request reaches my approval level
**So that** I know immediately when action is required without checking the platform

**Acceptance criteria:**
- [ ] Email is sent within 60 seconds of a request reaching the approver's level
- [ ] Email shows: reference number, requester name, category, amount, cost centre, priority, budget impact percentage, justification text
- [ ] Email contains Approve and Reject CTA buttons (signed email-action tokens, 48h expiry)
- [ ] Email footer contains a link to view full details on the platform
- [ ] Email subject: `[Action Required] Approval Request — {reference_no}: {title}`

---

### Story 8.2: Receive a request outcome notification
**As a** requester
**I want to** receive an email when my request is approved or rejected
**So that** I know the outcome without having to log in and check

**Acceptance criteria:**
- [ ] Email is sent on final approval and on any rejection
- [ ] Rejection email includes the mandatory rejection reason provided by the approver
- [ ] Approval email includes the PO reference number once the draft PO is created
- [ ] In-app notification bell is updated simultaneously

---

### Story 8.3: Receive a budget warning notification
**As a** budget owner or finance team member
**I want to** receive an alert when a cost centre reaches 90% of its budget utilisation
**So that** I can take action before the budget is fully committed

**Acceptance criteria:**
- [ ] Alert email and in-app notification sent when committed spend crosses 90% of budget for any cost centre
- [ ] Alert shows: cost centre name, budget amount, committed amount, remaining amount
- [ ] Recipients: the cost centre's budget owner and all users with the `finance` role in that entity

---

## Feature 9: Approval Delegation (F-010)

### Story 9.1: Delegate approval authority
**As an** approver
**I want to** delegate my approval authority to a colleague for a set date range
**So that** requests don't stall while I'm on leave

**Acceptance criteria:**
- [ ] Approver can create a delegation from their profile or settings screen: select delegate user, valid-from date, valid-until date, reason
- [ ] System rejects delegation if the date range overlaps with an existing active delegation
- [ ] While delegation is active, all new approval requests route to the delegate, not the delegator
- [ ] Both delegator and delegate receive an email and in-app notification confirming the delegation
- [ ] Active delegation is shown visually in the approver's inbox header
- [ ] When a delegate approves a request, the approval_event records both the delegate's ID and notes it was a delegated action (AC-04)

---

## Feature 10: Dashboard (F-011)

### Story 10.1: View the main dashboard
**As any** logged-in user
**I want to** see an overview of my pending actions and recent activity
**So that** I know what needs my attention immediately after logging in

**Acceptance criteria:**
- [ ] Dashboard shows 4 metric cards: My Pending Requests | Pending My Approval | Budget Utilisation % (current entity) | YTD Spend vs Budget
- [ ] Approvers see their approval inbox (pending requests, sorted by urgency then age) directly on the dashboard
- [ ] Requesters see their last 10 submitted requests with colour-coded status badges
- [ ] Budget owners see a warning banner for any cost centre over 90% utilisation
- [ ] "New Purchase Request" and "New Expense Claim" quick-action buttons are prominent
- [ ] Dashboard loads within 3 seconds on a 10 Mbps connection
- [ ] All cards show skeleton loading states while data loads; empty states for zero-item lists

---

## Feature 11: Admin — Approval Matrix Configuration (F-012)

### Story 11.1: Simulate the approval path before changing the matrix
**As an** admin
**I want to** test a hypothetical category and amount against the current DOA matrix
**So that** I can verify routing is correct before making changes go live

**Acceptance criteria:**
- [ ] "Simulate Approval Path" button is available on the Approval Matrix screen
- [ ] Admin enters: category and amount
- [ ] System returns the exact sequence of approvers and their roles who would be required
- [ ] Simulation uses the live matrix; does not create any records
- [ ] Result updates immediately without a page reload

---

## Feature 12: Audit Trail & Reporting (F-013)

### Story 12.1: View the full audit history for a document
**As a** procurement officer, admin, or group admin
**I want to** see every action taken on a spend request in chronological order
**So that** I can answer questions about any decision without digging through emails

**Acceptance criteria:**
- [ ] Request detail page shows a vertical timeline of all approval_events for that document
- [ ] Each event shows: actor name, action taken, timestamp (UTC), previous status, new status, comment
- [ ] Timeline is immutable — no user, including admins, can delete or alter entries
- [ ] Events are in chronological order, most recent last

---

### Story 12.2: Download a PDF audit report for a document (AC-08)
**As a** group admin, procurement officer, or finance team member
**I want to** generate a PDF audit report for any spend request on demand
**So that** I can provide a formal audit trail to internal or external auditors

**Acceptance criteria:**
- [ ] "Download Audit Report" button is visible on any request detail page
- [ ] PDF includes: document header (reference, type, requester, date), all form field values, budget impact summary, and the complete approval event timeline with actors and timestamps
- [ ] PDF is generated in under 10 seconds
- [ ] PDF filename: `{reference_no}_audit_{YYYY-MM-DD}.pdf`

---

### Story 12.3: Export the audit log to CSV
**As an** admin or group admin
**I want to** export the full audit log for a date range to CSV
**So that** external auditors have machine-readable evidence of all platform actions

**Acceptance criteria:**
- [ ] Admin > Reports > Audit Log screen allows filtering by: date range, entity, document type, action type, actor
- [ ] "Export CSV" generates a download containing all matching events
- [ ] CSV columns: log_id, request_id, reference_no, actor_id, actor_name, action, previous_state, new_state, timestamp_utc, ip_address
- [ ] Audit records are retained for a minimum of 7 years

---

## Feature 13: Snowflake Integration (F-014)

### Story 13.1: Approval events push to Snowflake in near-real time (AC-07)
**As a** data / BI team member
**I want** every approval action to be available in Snowflake within 60 minutes
**So that** management Power BI dashboards always reflect current spend status

**Acceptance criteria:**
- [ ] A Supabase Database Webhook fires on every INSERT into approval_events
- [ ] The webhook handler transforms the event to the agreed Snowflake schema (FACT_APPROVAL_EVENTS and FACT_SPEND_REQUESTS)
- [ ] Approved transactions appear in Snowflake FACT_SPEND_REQUESTS within 60 minutes of the final approval event (AC-07)
- [ ] On webhook failure: the event is logged in webhook_logs and retried at T+5min and T+30min (max 3 attempts)
- [ ] After 3 failures: status = abandoned; group_admin receives an alert

---

### Story 13.2: Budget positions sync to Snowflake on a schedule
**As a** data / BI team member
**I want** budget positions to refresh in Snowflake every 15 minutes
**So that** Power BI dashboards show near-real-time budget utilisation without manual refreshes

**Acceptance criteria:**
- [ ] A Supabase Edge Function runs on a 15-minute cron schedule
- [ ] Pushes a current snapshot of FACT_BUDGET_POSITIONS for all active cost centres and periods
- [ ] Also pushes any dimension changes (new vendors, users, cost centres) to the relevant DIM tables
- [ ] Push is idempotent — running it twice does not create duplicate rows in Snowflake

---

## Feature 14: Auto-Escalation (F-015)

### Story 14.1: Receive a reminder when an approval is overdue
**As a** requester
**I want** an automatic reminder sent to the approver if they haven't acted within 24 hours
**So that** my request doesn't get stuck silently

**Acceptance criteria:**
- [ ] A Supabase Edge Function cron job runs every 30 minutes to check for stale approvals
- [ ] If a request has been at the same approval level for 24+ business hours with no action: a reminder email is sent to the current approver(s)
- [ ] The reminder email contains the same Approve/Reject links as the original notification

---

### Story 14.2: Escalate an unanswered request to the approver's manager
**As a** requester
**I want** my request to automatically escalate to the approver's manager after 48 hours with no action
**So that** approval bottlenecks are resolved without my intervention

**Acceptance criteria:**
- [ ] If a request has been at the same approval level for 48+ business hours with no action: the request is escalated to the approver's manager
- [ ] Both the approver's manager and the requester receive a notification of the escalation
- [ ] An approval_event with action = `escalated` is created
- [ ] If no manager is configured, escalation goes to the group_admin with a system alert

---

## Feature 15: Multi-Entity Isolation (All features)

### Story 15.1: Users are isolated to their own entity (AC-09)
**As a** user in Entity A
**I want** to be certain I cannot see documents, budgets, or users from Entity B
**So that** the platform maintains strict confidentiality between BPO Group entities

**Acceptance criteria:**
- [ ] All database queries are scoped to the current user's entity_id via RLS policies
- [ ] A user in Entity A cannot access any spend requests, POs, budgets, cost centres, or user profiles from Entity B — via the UI, direct API calls, or URL manipulation
- [ ] The group_admin role is the only role that can view consolidated data across all entities
- [ ] Logging in as an Entity A user and navigating to any Entity B resource returns a 403 / not found response (AC-09)

---

## Feature 16: Non-Functional — Performance & Accessibility

### Story 16.1: Platform meets performance targets
**As any** user
**I want** the platform to respond quickly
**So that** I'm not waiting for pages to load during my working day

**Acceptance criteria:**
- [ ] Core pages (dashboard, request list, approver inbox) load within 2 seconds on a 10 Mbps connection
- [ ] The dashboard loads within 3 seconds
- [ ] The platform supports 500 concurrent users without degradation
- [ ] Loading skeleton states are shown immediately while data fetches (no blank screens)

---

### Story 16.2: Platform is accessible and mobile-friendly (AC-10)
**As a** field staff member using a mobile phone
**I want** to use the full platform on my mobile browser
**So that** I can submit expense claims in the field and approvers can action requests on the go

**Acceptance criteria:**
- [ ] Platform is fully functional on iOS Safari and Android Chrome
- [ ] Receipt photo upload works via mobile camera
- [ ] All interactive elements meet WCAG 2.1 AA minimum standards (contrast, focus, keyboard navigation)
- [ ] Platform functions correctly on Chrome, Edge, and Safari on both desktop and mobile (AC-10)
