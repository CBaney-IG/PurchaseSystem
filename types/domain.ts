// Core domain types — sourced from FRS-USMP-001 §10
// These types are shared across client and server code.

export type SpendRequestType = 'purchase_request' | 'expense_claim'

export type SpendRequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_l1'
  | 'pending_l2'
  | 'pending_l3'
  | 'pending_info'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'converted'

export type UserRole =
  | 'requester'
  | 'approver_l1'
  | 'approver_l2'
  | 'approver_l3'
  | 'procurement_officer'
  | 'finance'
  | 'admin'
  | 'group_admin'

export type ApprovalAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'delegated'
  | 'info_requested'
  | 'info_provided'
  | 'escalated'
  | 'cancelled'

export type PurchaseOrderStatus =
  | 'draft'
  | 'issued'
  | 'acknowledged'
  | 'received'
  | 'invoiced'
  | 'closed'
  | 'cancelled'

export interface Entity {
  id: string
  name: string
  code: string
  parent_id: string | null
  parent?: Pick<Entity, 'id' | 'name' | 'code'>
  active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  entity_id: string
  entity?: Entity
  full_name: string
  email: string
  role: UserRole
  department: string | null
  manager_id: string | null
  manager?: Profile
  approver_limit: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface CostCentre {
  id: string
  entity_id: string
  code: string
  name: string
  budget_owner_id: string | null
  parent_id: string | null
  active: boolean
}

export interface Budget {
  id: string
  cost_centre_id: string
  cost_centre?: CostCentre
  category: string
  period_year: number
  period_month: number | null
  amount: number
  committed: number
  actuals: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  entity_id: string
  name: string
  category: string
  contact_name: string | null
  contact_email: string | null
  preferred: boolean
  status: 'active' | 'inactive' | 'pending'
  created_at: string
}

export interface ApprovalMatrix {
  id: string
  entity_id: string
  category: string
  level: number
  min_amount: number
  max_amount: number | null
  approver_role: UserRole
  require_all: boolean
  escalate_hours: number
  active: boolean
}

export interface SpendRequest {
  id: string
  entity_id: string
  type: SpendRequestType
  reference_no: string
  requester_id: string
  requester?: Profile
  cost_centre_id: string
  cost_centre?: CostCentre
  project_code: string | null
  vendor_id: string | null
  vendor?: Vendor
  vendor_name: string | null
  category: string
  title: string
  description: string | null
  amount: number
  currency: string
  status: SpendRequestStatus
  current_level: number
  priority: 'normal' | 'urgent'
  required_by: string | null
  justification: string | null
  budget_flag: boolean
  duplicate_flag: boolean
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  approval_events?: ApprovalEvent[]
  attachments?: SpendRequestAttachment[]
}

export interface SpendRequestAttachment {
  id: string
  request_id: string
  file_name: string
  storage_path: string
  file_type: string | null
  file_size_bytes: number | null
  uploaded_by: string | null
  created_at: string
}

export interface ApprovalEvent {
  id: string
  request_id: string
  approver_id: string
  approver?: Profile
  level: number
  action: ApprovalAction
  comment: string | null
  previous_status: string | null
  new_status: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface PurchaseOrder {
  id: string
  entity_id: string
  reference_no: string
  request_id: string
  request?: SpendRequest
  vendor_id: string | null
  vendor?: Vendor
  vendor_name: string | null
  procurement_officer_id: string | null
  status: PurchaseOrderStatus
  amount: number
  currency: string
  notes: string | null
  issued_at: string | null
  expected_delivery: string | null
  created_at: string
  updated_at: string
}

export interface Delegation {
  id: string
  delegator_id: string
  delegator?: Profile
  delegate_id: string
  delegate?: Profile
  valid_from: string
  valid_until: string
  reason: string | null
  active: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  request_id: string | null
  type: string
  title: string
  body: string | null
  read: boolean
  email_sent: boolean
  created_at: string
}
