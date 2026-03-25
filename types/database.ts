export type UserRole = 'sales' | 'engineer' | 'bizdev' | 'cs' | 'admin'
export type ProductType = 'OCR' | 'TimecardAgent' | 'NandemonAI' | 'AIConsulting' | 'Other'
export type ContractStatus = 'pre_contract' | 'negotiating' | 'contracted'
export type Priority = 'high' | 'medium' | 'low'
export type RequestStatus = 'chatting' | 'sheet_complete' | 'under_review' | 'responded' | 'closed'
export type Feasibility = 'feasible' | 'conditional' | 'infeasible'

export interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  asana_user_gid: string | null
  created_at: string
  updated_at: string
}

export interface FeatureRequest {
  id: string
  created_by: string | null
  customer_name: string
  sales_owner_name: string | null
  product: ProductType
  contract_status: ContractStatus
  priority: Priority
  raw_request: string
  status: RequestStatus
  asana_parent_task_gid: string | null
  asana_parent_task_name: string | null
  asana_subtask_gid: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  // JOIN
  creator?: User
  assignee?: User
  request_sheet?: RequestSheet
  responses?: ResponseRecord[]
}

export interface ChatMessage {
  id: string
  request_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface RequestSheet {
  id: string
  request_id: string
  summary: string | null
  current_workaround: string | null
  expected_behavior: string | null
  target_users: string | null
  target_screen: string | null
  deadline: string | null
  budget: string | null
  data_scale: string | null
  external_integrations: string | null
  io_format: string | null
  security_requirements: string | null
  business_impact: string | null
  unchecked_items: string | null
  tier1_complete: boolean
  tier2_complete: boolean
  raw_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type BugReproducibility = 'reproducible' | 'not_reproducible' | 'no_environment'
export type OsType = 'windows' | 'mac' | 'linux'
export type BrowserType = 'chrome' | 'edge' | 'safari' | 'firefox' | 'brave'

export interface BugReport {
  id: string
  created_by: string | null
  product: ProductType
  is_production_user: boolean
  reproducibility: BugReproducibility
  what_action: string
  where_page: string
  what_happened: string
  expected_result: string
  os_environments: OsType[]
  browser_environments: BrowserType[]
  page_url: string | null
  file_format: string | null
  execution_id: string | null
  asana_task_gid: string | null
  asana_task_name: string | null
  created_at: string
  updated_at: string
  creator?: User
}

export interface ResponseRecord {
  id: string
  request_id: string
  responded_by: string | null
  questions: string | null
  estimate_amount: string | null
  estimate_duration: string | null
  feasibility: Feasibility | null
  notes: string | null
  created_at: string
  responder?: User
}
