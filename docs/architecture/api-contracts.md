# API Contracts

> **Status:** Active — confirmed during `/init-architecture` (June 2026)
> Sourced from FRS-USMP-001 §4.

## Conventions

- All **mutations** (state changes, approvals, admin actions) use Next.js Server Actions or API routes with the Supabase **service role key** — never the anon key.
- All **reads** use the authenticated user's session (anon key + RLS).
- Standard response envelope: `{ data: T | null, error: { message: string, code: string } | null }`
- Authentication via Supabase session cookie (set by `@supabase/ssr` middleware).
- All endpoints validate input with Zod schemas before touching the database.
- HTTP status codes: 200 success, 400 validation error, 401 unauthenticated, 403 unauthorised, 404 not found, 500 server error.

## Response Shape

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

---

## Spend Request APIs

### `POST /api/requests`
**Purpose:** Create a new PR or expense claim (status = `draft`)
**Auth:** Authenticated session
**Request body:**
```json
{
  "type": "purchase_request" | "expense_claim",
  "title": "string",
  "category": "string",
  "cost_centre_id": "uuid",
  "amount": "number",
  "currency": "ZAR",
  "description": "string",
  "justification": "string",
  "vendor_id": "uuid | null",
  "vendor_name": "string | null",
  "project_code": "string | null",
  "required_by": "date | null",
  "priority": "normal | urgent"
}
```
**Returns:** `{ id: string, reference_no: string, status: "draft" }`

---

### `GET /api/requests`
**Purpose:** List requests filtered by the caller's role and entity
**Auth:** Authenticated session
**Query params:** `type`, `status`, `category`, `cost_centre_id`, `page`, `limit`
**Returns:** `{ data: SpendRequest[], count: number }`

---

### `GET /api/requests/[id]`
**Purpose:** Get a single request with approval history and attachments
**Auth:** Authenticated session (RLS enforced)
**Returns:** `SpendRequest & { approval_events: ApprovalEvent[], attachments: SpendRequestAttachment[] }`

---

### `PATCH /api/requests/[id]`
**Purpose:** Update a draft request
**Auth:** Requester only (status must be `draft`)
**Returns:** `{ updated: SpendRequest }`

---

### `POST /api/requests/[id]/submit`
**Purpose:** Submit a draft request for approval; generates reference number, sets status to `pending_l1`
**Auth:** Requester only
**Side effects:** Runs budget check (sets `budget_flag`), duplicate check (sets `duplicate_flag`), creates initial `approval_event` with action `submitted`, sends approval-needed notification to L1 approver(s)
**Returns:** `{ status: "pending_l1", reference_no: string }`

---

### `DELETE /api/requests/[id]`
**Purpose:** Cancel / soft-delete a request
**Auth:** Requester (status must be `draft` or `pending_l1`) or `admin`
**Returns:** `{ cancelled: true }`

---

## Approval Action APIs

### `POST /api/approvals/[id]/approve`
**Purpose:** Approve a request at the current level
**Auth:** Valid approver for the current level (role-checked server-side)
**Request body:** `{ comment?: string }`
**Side effects:** Calls `processApproval('approve')`; routes to next level or marks fully approved; generates PO draft if final approval on a PR; triggers Snowflake webhook; notifies requester
**Returns:** `{ newStatus: SpendRequestStatus }`

---

### `POST /api/approvals/[id]/reject`
**Purpose:** Reject a request; comment is mandatory
**Auth:** Valid approver for the current level
**Request body:** `{ comment: string }` *(required — validated; min 10 chars)*
**Side effects:** Calls `processApproval('reject')`; status = `rejected`; notifies requester with comment; triggers Snowflake webhook
**Returns:** `{ newStatus: "rejected" }`

---

### `POST /api/approvals/[id]/request-info`
**Purpose:** Pause the request and ask the requester for more information
**Auth:** Valid approver for the current level
**Request body:** `{ comment: string }` *(the question — required)*
**Side effects:** Status = `pending_info`; notifies requester
**Returns:** `{ newStatus: "pending_info" }`

---

### `POST /api/approvals/[id]/provide-info`
**Purpose:** Requester submits the additional information requested
**Auth:** Requester only (status must be `pending_info`)
**Request body:** `{ comment: string }` *(required)*
**Side effects:** Status returns to `pending_lX` (current level); notifies approver(s)
**Returns:** `{ newStatus: SpendRequestStatus }`

---

### `GET /api/approvals/inbox`
**Purpose:** Get all requests pending the current user's action
**Auth:** Authenticated session (approver role required)
**Query params:** `category`, `priority`, `amount_min`, `amount_max`, `entity_id` (group_admin only), `page`, `limit`
**Returns:** `{ pending: SpendRequest[], count: number }`

---

### `GET /api/approvals/email-action`
**Purpose:** Approve or reject via signed email link — **no session required**
**Auth:** Signed JWT in `?token=` query param (HMAC-SHA256, `jose`, 48h expiry, single-use)
**Token payload:** `{ requestId, approverId, action: "approve"|"reject", exp }`
**Side effects:** Validates token (signature, expiry, not-consumed); calls `processApproval()`; marks token consumed in `webhook_logs`
**Returns:** HTML confirmation page (no JSON — this is a browser redirect target)
**Error cases:** Expired token → HTML expiry page with login link. Already-used token → HTML "already actioned" page.

---

## Admin APIs

All admin routes require `admin` or `group_admin` role unless noted.

### `GET/POST/PATCH /api/admin/users`
**Purpose:** List users, invite a user, update role / entity / active status
**Notes:** POST triggers Supabase Auth invite email. PATCH role change takes effect immediately.

### `GET/POST/PATCH/DELETE /api/admin/approval-matrix`
**Purpose:** CRUD on approval matrix rules per entity/category/level
**Notes:** Changes take effect immediately for new requests. All changes logged to audit via `approval_events` metadata.

### `GET/POST/PATCH/DELETE /api/admin/vendors`
**Purpose:** Vendor catalogue management
**Auth:** `admin` or `procurement_officer`

### `GET/POST/PATCH /api/admin/budgets`
**Purpose:** Budget periods and amounts per cost centre/category/year
**Auth:** `admin` or `finance`
**Notes:** Mid-year PATCH requires a `reason` field; triggers recalculation of all budget positions.

### `GET/POST/PATCH /api/admin/entities`
**Purpose:** Entity / business unit management
**Auth:** `group_admin` only

### `GET/POST/DELETE /api/admin/delegations`
**Purpose:** Create and cancel approval delegations
**Auth:** Any approver role (can only create/delete their own delegations); `admin` can view all in entity
**Notes:** POST validates no overlapping active delegation for the same delegator. DELETE sets `active = false`.

---

## Snowflake Webhook

### `POST /api/webhooks/snowflake-push`
**Purpose:** Receives Supabase Database Webhook events and pushes transformed payloads to Snowflake
**Auth:** `x-webhook-secret` header validated against `SNOWFLAKE_WEBHOOK_SECRET` env var
**Triggered by:** Supabase DB Webhook on INSERT to `approval_events` AND UPDATE to `spend_requests.status`

**Request body (Supabase webhook format):**
```json
{
  "type": "INSERT" | "UPDATE",
  "table": "approval_events" | "spend_requests",
  "record": { ...full row data },
  "old_record": { ...previous row data if UPDATE }
}
```

**Handler logic:**
1. Validate `x-webhook-secret` header — return 401 if invalid
2. Parse Supabase webhook payload
3. Transform to Snowflake target schema (see FRS §8.2)
4. POST transformed JSON to `SNOWFLAKE_ENDPOINT_URL` with bearer auth
5. Log attempt to `webhook_logs` (status: `sent` or `failed`)
6. Return **200 always** (prevents Supabase retry storm on 5xx)

**Retry logic:** Supabase Edge Function queries `webhook_logs WHERE status = 'failed'` on schedule.
- Attempt 1: T+0 (immediate, via webhook)
- Attempt 2: T+5 min (Edge Function retry)
- Attempt 3: T+30 min (Edge Function retry)
- After 3 failures: status = `abandoned`, alert sent to `group_admin`

---

## Approval Engine — `processApproval()`

This is not an HTTP endpoint but the core server-side function called by all approval API routes.

```typescript
// lib/approvals/processApproval.ts
async function processApproval(
  requestId: string,
  action: ApprovalAction,
  approverId: string,
  comment?: string
): Promise<{ success: boolean; newStatus: SpendRequestStatus; error?: string }>
```

**Logic (must implement exactly as per FRS §5.1):**

On `approve`:
1. Fetch `spend_request` and `approval_matrix` for entity + category + amount
2. Call `getNextRequiredLevel(matrix, current_level, amount)` — returns `null` if all levels satisfied
3. If `null`: mark `approved`, create event, generate PO draft (PRs only), notify requester, trigger Snowflake webhook
4. If next level: update status to `pending_lX`, notify next level approvers

On `reject`:
- Mark `rejected`, create event with mandatory comment, notify requester, trigger Snowflake webhook

On `info_requested`:
- Mark `pending_info`, notify requester with comment

On `info_provided`:
- Return to `pending_lX` (current level), notify current approvers

**Approver resolution** (FRS §5.2):
1. Get `approver_role` for level N from `approval_matrices`
2. Find active profiles with that role in the entity
3. Check for active delegations — include delegates
4. For L1: prefer `manager_id` of requester if matrix is manager-based
5. If no valid approver found: escalate to `group_admin` + system alert

---

## Server Actions

Server Actions are used for form submissions (PR create/update, expense claim, admin CRUD). They live in `app/` route directories and are called directly from Client Components.

All Server Actions:
- Validate input with Zod before any DB operation
- Use `createServiceClient()` for writes
- Use `revalidatePath()` or `revalidateTag()` to invalidate React Query / Next.js cache
- Return `{ data, error }` shape consistent with API routes
